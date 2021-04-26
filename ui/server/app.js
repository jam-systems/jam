/* eslint-env node */
const express = require('express');
const app = express();
const fetch = require('node-fetch');
const qs = require('qs');
const fs = require('fs');
const ical = require('ical-generator').default;

let ejs = require('ejs');

app.use(express.static(process.env.JAM_CONFIG_DIR + '/public'));
app.use(express.static(process.env.STATIC_FILES_DIR || 'public'));

const jamHost = process.env.JAM_HOST || 'beta.jam.systems';
const jamSchema = process.env.JAM_SCHEMA || 'https://';

const urls = {
  jam: process.env.JAM_URL || `${jamSchema}${jamHost}`,
  pantry: process.env.JAM_PANTRY_URL || `${jamSchema}${jamHost}/_/pantry`,
  signalHub:
    process.env.JAM_SIGNALHUB_URL || `${jamSchema}${jamHost}/_/signalhub`,
  stun: process.env.JAM_STUN_SERVER || `stun:stun.${jamHost}:3478`,
  turn: process.env.JAM_TURN_SERVER || `turn:turn.${jamHost}:3478`,
  turnCredentials: {
    username: process.env.JAM_TURN_SERVER_USERNAME || 'test',
    credential: process.env.JAM_TURN_SERVER_CREDENTIAL || 'yieChoi0PeoKo8ni',
  },
};

console.log(urls);

const pantryApiPrefix = `${urls.pantry}/api/v1/rooms`;

const defaultMetaInfo = {
  ogTitle: 'Jam',
  ogDescription: 'Join this audio room',
  ogUrl: urls.jam,
  ogImage: `${urls.jam}/img/jam-app-icon.jpg`,
  favIcon: '/img/jam-app-icon.jpg',
};

const getRoomMetaInfo = async roomPath => {
  try {
    // remove .ics or other suffixes
    roomPath = roomPath.split('.')[0];
    const roomId = roomPath.substring(1);
    const roomInfo = await (await fetch(pantryApiPrefix + roomPath)).json();
    return {
      ogTitle: roomInfo['name'],
      ogDescription: roomInfo['description'],
      ogUrl: `${urls.jam}${roomPath}`,
      ogImage: roomInfo['logoURI'] || `${urls.jam}/img/jam-app-icon.jpg`,
      color: roomInfo['color'] || '',
      id: roomId || '',
      favIcon: roomInfo['logoURI'] || '/img/jam-app-icon.jpg',
      schedule: roomInfo['schedule'],
    };
  } catch (e) {
    console.log(`Error getting info for ${roomPath}`);
    return {};
  }
};

let jamConfigFromFile = {};
try {
  jamConfigFromFile = JSON.parse(
    fs
      .readFileSync(process.env.JAM_CONFIG_DIR + '/jam-config.json')
      .toString('utf-8')
  );
} catch (e) {
  console.log('No config file found, starting with empty config');
}

const jamConfig = {
  ...jamConfigFromFile,
  urls,
  development: !!process.env.DEVELOPMENT,
};
app.use('/config.json', (_, res) => {
  res.json(jamConfig);
});

app.use(async (req, res) => {
  if (req.path === '/new') {
    return res.redirect(
      302,
      `${urls.jam}/${Math.random().toString(36).substr(2, 6)}`
    );
  }

  if (req.path === '/_/integrations/slack') {
    return res.json({
      response_type: 'in_channel',
      text: `${urls.jam}/${Math.random().toString(36).substr(2, 6)}`,
    });
  }

  if (req.path === '/_/integrations/slack/install') {
    let slackInstallURI = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=chat:write,chat:write.public,commands&user_scope=`;
    return res.redirect(302, slackInstallURI);
  }

  if (req.path === '/_/integrations/slack/oauth') {
    if (!req.query.code) {
      console.log('invalid code from Slack');
      return res.send('invalid code parameter');
    }

    let params = {
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code: req.query.code,
    };

    let SLACK_API_URL = process.env.SLACK_API_URL || 'https://slack.com/api';

    const result = await fetch(`${SLACK_API_URL}/oauth.v2.access`, {
      method: 'POST',
      body: qs.stringify(params),
      headers: {
        'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });
    let apiResponse = await result.json();
    if (apiResponse.ok) {
      console.log(apiResponse);
      return res.send('Jam was successfully added to your workspace.');
    } else {
      console.log(apiResponse);
      return res.send(
        'Jam was not added to your workspace, please try again later.'
      );
    }
  }

  const metaInfo =
    req.path === '/'
      ? defaultMetaInfo
      : {
          ...defaultMetaInfo,
          ...(await getRoomMetaInfo(req.path)),
        };

  if (req.path.includes('/_/integrations/oembed')) {
    if (!req.query.url?.startsWith(`${urls.jam}/`)) return res.json();

    let width = parseInt(req.query.width || '440', 10);
    let height = parseInt(req.query.height || '600', 10);

    return res.json({
      type: 'rich',
      version: '1.0',
      html: `<iframe src="${req.query.url}" allow="microphone *;" width="${width}" height="${height}"></iframe>`,
      width: width,
      height: height,
      provider_name: 'Jam',
      provider_url: urls.jam,
    });
  }

  if (req.path.endsWith('.ics')) {
    console.log(metaInfo);
    if (!metaInfo.id) return res.sendStatus(404);

    const calendar = ical({
      domain: urls.jam,
      name: metaInfo.ogTitle,
      prodId: {company: 'Jam', product: 'Jam'},
      timezone: metaInfo.schedule?.timezone,
    });

    if (metaInfo.schedule) {
      let startdt = new Date(
        `${metaInfo.schedule?.date}T${metaInfo.schedule?.time}`
      );
      let enddt = new Date(startdt.getTime() + 20 * 60 * 1000);
      console.log(startdt);
      let event = calendar.createEvent({
        start: startdt,
        end: enddt,
        summary: metaInfo.ogTitle,
        description: metaInfo.ogDescription,
        url: `${urls.jam}/${metaInfo.id}`,
      });
      if (metaInfo.schedule?.repeat) {
        event.repeating({
          freq: metaInfo.schedule.repeat.toUpperCase(),
        });
      }
    }

    res.set('Content-Type', 'text/calendar');
    return res.send(calendar.toString());
  }

  if (req.path.endsWith('manifest.json')) {
    return res.json({
      short_name: metaInfo.ogTitle,
      name: metaInfo.ogTitle,
      icons: [
        {
          src: `${urls.jam}/img/jam-app-icon-512.png`,
          type: 'image/png',
          sizes: '512x512',
          purpose: 'any',
        },
        {
          src: `${urls.jam}/img/jam-app-icon-192.png`,
          type: 'image/png',
          sizes: '192x192',
          purpose: 'any',
        },
      ],
      start_url: '/?source=pwa',
      display: 'standalone',
      scope: '/',
      theme_color: metaInfo.color,
      description: metaInfo.ogDescription,
    });
  }

  res.send(
    ejs.render(
      `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta property="og:title" content="<%= metaInfo.ogTitle %>" />
    <meta property="og:description" content="<%= metaInfo.ogDescription %>" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="<%= metaInfo.ogUrl %>" />
    <meta
      property="og:image"
      content="<%= metaInfo.ogImage %>"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      rel="shortcut icon"
      type="image/png"
      href="<%= metaInfo.favIcon %>"
    />
    <link rel="apple-touch-icon" href="<%= metaInfo.favIcon %>" />
    <!-- TODO: move tailwind to build pipeline if we keep it -->
    <link
      href="https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css"
      rel="stylesheet"
    />
    <link
      href="/css/main.css"
      rel="stylesheet"
    />
    <link rel="manifest" href="<%= metaInfo.ogUrl %>/manifest.json">
    <link rel="alternate" type="application/json+oembed" href="${
      urls.jam
    }/_/integrations/oembed?url=<%= metaInfo.ogUrl %>">
    <title><%= metaInfo.ogTitle %></title>
  </head>
  <body>
    <div id="root"></div>
    <script>
        window.jamConfig = ${JSON.stringify(jamConfig)};
    </script>
    <script type="module" src="./bundle.js"></script>
  </body>
</html>
`,
      {metaInfo}
    )
  );
});

module.exports = app;
