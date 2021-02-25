const express = require('express');
const app = express();
const fetch = require('node-fetch');

let ejs = require('ejs');


app.use(express.static(process.env.STATIC_FILES_DIR || '.'))

const jamHost = process.env.JAM_HOST || 'beta.jam.systems';

const pantryApiPrefix = `https://${jamHost}/_/pantry/api/v1/rooms`;

const defaultMetaInfo = {
    ogTitle: "Jam",
    ogDescription: "Join this Jam audio space",
    ogUrl: `https://${jamHost}/`,
    ogImage: `https://${jamHost}/img/jam-app-icon.jpg`,
    favIcon: '/img/jam-app-icon.jpg',
}


const getRoomMetaInfo = async (roomPath) => {
  try {
    const roomInfo = (await (await fetch(pantryApiPrefix + roomPath)).json());
    return {
        ogTitle: roomInfo['name'],
        ogDescription: roomInfo['description'],
        ogUrl: `https://${jamHost}${roomPath}`,
        ogImage: roomInfo['logoURI'] || `https://${jamHost}/img/jam-app-icon.jpg`,
        color: roomInfo['color'] || '',
        id: roomInfo['id'] || '',
        favIcon: roomInfo['logoURI'] || '/img/jam-app-icon.jpg',
    }
  } catch(e) {
    console.log(`Error getting info for ${roomPath}`);
    return {};
  }
}

app.use(async (req, res) => {
    if (req.path === '/service-worker.js') {
      return res.send(`console.log('hello from service-worker.js')`);
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
            "src": metaInfo.ogImage,
            "type": "image/jpg",
            "sizes": "1024x1024",
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
    <script type="module" src="./bundle.js"></script>
  </body>
</html>
`, {metaInfo: metaInfo}));
})

module.exports = app;
