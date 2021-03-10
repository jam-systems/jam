const express = require('express');
const app = express();
const fetch = require('node-fetch');
const qs = require('qs');

let ejs = require('ejs');


app.use(express.static(process.env.STATIC_FILES_DIR || '.'))

const jamHost = process.env.JAM_HOST || 'beta.jam.systems';
const jamSchema = process.env.JAM_SCHEMA || 'https://';
const jamUrl = process.env.JAM_URL || `${jamSchema}${jamHost}`;
const pantryUrl = process.env.JAM_PANTRY_URL || `${jamUrl}/_/pantry`
const signalHubUrl = process.env.JAM_SIGNALHUB_URL || `${jamUrl}/_/signalhub`
const stunServer = process.env.JAM_STUN_SERVER || `stun.${jamHost}:3478`;
const turnServer = process.env.JAM_TURN_SERVER || `turn.${jamHost}:3478`;




const pantryApiPrefix = `${pantryUrl}/api/v1/rooms`;

const defaultMetaInfo = {
    ogTitle: "Jam",
    ogDescription: "Join this Jam audio space",
    ogUrl: jamUrl,
    ogImage: `${jamUrl}/img/jam-app-icon.jpg`,
    favIcon: '/img/jam-app-icon.jpg',
}


const getRoomMetaInfo = async (roomPath) => {
  try {
    const roomInfo = (await (await fetch(pantryApiPrefix + roomPath)).json());
    return {
        ogTitle: roomInfo['name'],
        ogDescription: roomInfo['description'],
        ogUrl: `${jamUrl}${roomPath}`,
        ogImage: roomInfo['logoURI'] || `${jamUrl}/img/jam-app-icon.jpg`,
        color: roomInfo['color'] || '',
        id: roomInfo['id'] || '',
        favIcon: roomInfo['logoURI'] || '/img/jam-app-icon.jpg',
    }
  } catch(e) {
    console.log(`Error getting info for ${roomPath}`);
    return {};
  }
}

const jamConfig = {
    jamHost,
    jamUrl,
    pantryUrl,
    signalHubUrl,
    stunServer,
    turnServer,
    development: !!process.env.DEVELOPMENT
};
app.use("/config.json", (_, res) => {
    res.json(jamConfig);
})

app.use(async (req, res) => {

    if (req.path === '/_/integrations/slack') {
      return res.json({
        "response_type": "in_channel",
        "text": `https://${jamHost}/${Math.random().toString(36).substr(2, 6)}`
      });
    }

    if (req.path === '/_/integrations/slack/install') {
      let SLACK_API_URL = process.env.SLACK_API_URL || "https://slack.com/api";
      let slackInstallURI = `${SLACK_API_URL}/https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=chat:write,chat:write.public,commands&user_scope=`;
      return res.redirect(302, slackInstallURI);
    }

    if (req.path === '/_/integrations/slack/oauth') {
      if (!req.query.code) {
        console.log("invalid code from Slack");
        return res.send('invalid code parameter');
      }

      let params = {
        client_id:     process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code: req.query.code
      };

      let SLACK_API_URL = process.env.SLACK_API_URL || "https://slack.com/api";

      const result = await fetch(`${SLACK_API_URL}/oauth.v2.access`, {
        method: 'POST',
        body: qs.stringify(params),
        headers: {
            'Content-type': 'application/x-www-form-urlencoded;charset=utf-8'
        }
      });
      console.log(await result.json());
      return res.send("success");
    }

    const metaInfo = req.path === '/' ? defaultMetaInfo : {
        ...defaultMetaInfo,
        ...(await getRoomMetaInfo(req.path))
    };

    if (req.path.endsWith('manifest.json')) {
      return res.json({
        "short_name": metaInfo.ogTitle,
        "name": metaInfo.ogTitle,
        "icons": [
          {
            "src": `https://${jamHost}/img/jam-app-icon-512.png`,
            "type": "image/png",
            "sizes": "512x512",
            "purpose": "any"
          },
          {
            "src": `https://${jamHost}/img/jam-app-icon-192.png`,
            "type": "image/png",
            "sizes": "192x192",
            "purpose": "any"
          }
        ],
        "start_url": "/?source=pwa",
        "display": "standalone",
        "scope": "/",
        "theme_color": metaInfo.color,
        "description": metaInfo.ogDescription,
      });
    }

    res.send(ejs.render(`
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
    <title><%= metaInfo.ogTitle %></title>
  </head>
  <body>
    <div id="root" class="outer-container"></div>
    <script>
        window.jamConfig = ${JSON.stringify(jamConfig)};
    </script>
    <script type="module" src="./bundle.js"></script>
  </body>
</html>
`, {metaInfo}));
})

module.exports = app;
