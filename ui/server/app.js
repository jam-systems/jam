/* eslint-env node */
import express from 'express';
import fetch from 'node-fetch';
import qs from 'qs';
import fs from 'fs';
import ical from 'ical-generator';
import ejs from 'ejs';
import escape_html from 'escape-html';

export {app as default};

const app = express();

app.use(express.static(process.env.JAM_CONFIG_DIR + '/public'));
app.use(express.static(process.env.STATIC_FILES_DIR || 'public'));

const jamHost = process.env.JAM_HOST || 'beta.jam.systems';
const jamSchema = process.env.JAM_SCHEMA || 'https://';

const urls = {
  jam: process.env.JAM_URL || `${jamSchema}${jamHost}`,
  pantry: process.env.JAM_PANTRY_URL || `${jamSchema}${jamHost}/_/pantry`,
  stun: process.env.JAM_STUN_SERVER || `stun:stun.${jamHost}:3478`,
  turn: process.env.JAM_TURN_SERVER || `turn:turn.${jamHost}:3478`,
  turnCredentials: {
    username: process.env.JAM_TURN_SERVER_USERNAME || 'test',
    credential: process.env.JAM_TURN_SERVER_CREDENTIAL || 'yieChoi0PeoKo8ni',
  },
};

const preloadScript = getPreloadScript();

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
  sfu: ['true', '1'].includes(process.env.JAM_SFU),
};
console.log(jamConfig);
app.use('/config.json', (_, res) => {
  res.json(jamConfig);
});

app.use(async (req, res) => {
  let route = parsePath(req.path);
  console.log(req.path, route);
  if (route === 'new') {
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

  let {metaInfo, roomInfo, roomId} = await getRoomMetaInfo(route);

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
      fs.readFileSync('server/templates/index.ejs').toString('utf-8'),
      {
        metaInfo,
        preloadScript,
        urls,
        jamConfigString: JSON.stringify(jamConfig ?? null, escapeHtmlReplacer),
        roomInfoString: JSON.stringify(roomInfo ?? null, escapeHtmlReplacer),
        roomIdString: JSON.stringify(roomId ?? null, escapeHtmlReplacer),
      }
    )
  );
});

const escapeHtmlReplacer = function (key, value) {
  return typeof value === 'string' ? escape_html(value) : value;
};

const pantryApiPrefix = `${urls.pantry}/api/v1/rooms`;
const defaultMetaInfo = {
  ogTitle: 'Jam',
  ogDescription: 'Join this audio room',
  ogUrl: urls.jam,
  ogImage: `${urls.jam}/img/jam-app-icon.jpg`,
  favIcon: '/img/jam-app-icon.jpg',
};
const reservedRoutes = ['me', null];

async function getRoomMetaInfo(route) {
  if (reservedRoutes.includes(route)) return {metaInfo: defaultMetaInfo};
  try {
    // remove .ics or other suffixes
    const [roomId] = route.split('.');
    const roomInfo = await (await fetch(`${pantryApiPrefix}/${roomId}`)).json();
    return {
      metaInfo: {
        ...defaultMetaInfo,
        ogTitle: roomInfo.name,
        ogDescription: roomInfo.description,
        ogUrl: `${urls.jam}/${roomId}`,
        ogImage: roomInfo.logoURI || `${urls.jam}/img/jam-app-icon.jpg`,
        color: roomInfo.color || '',
        id: roomId || '',
        favIcon: roomInfo.logoURI || '/img/jam-app-icon.jpg',
        schedule: roomInfo.schedule,
      },
      roomInfo,
      roomId,
    };
  } catch (e) {
    console.log(`Error getting info for ${route}`);
    return {metaInfo: defaultMetaInfo};
  }
}

function parsePath(pathname) {
  let [first, second] = pathname.split('/').filter(x => x);
  let stageOnly = first === 's';
  // other special configs go here
  let route = stageOnly ? second : first;
  return route ?? null;
}

function getPreloadScript() {
  let bundleHelperFile = fs.readFileSync(
    `${process.env.STATIC_FILES_DIR || 'public'}/js/bundling/all.js`,
    {encoding: 'utf-8'}
  );
  let i = bundleHelperFile.indexOf('/chunk-');
  let j = bundleHelperFile.indexOf('.js', i);
  let thirdPartyChunk = bundleHelperFile.slice(i + 1, j + 3);
  return thirdPartyChunk;
}
