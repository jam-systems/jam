const express = require('express');
const app = express();
const fetch = require('node-fetch');


app.use(express.static(process.env.STATIC_FILES_DIR || '.'))

const jamHost = process.env.JAM_HOST || 'beta.jam.systems';

const pantryApiPrefix = `https://pantry.${jamHost}/api/v1/rooms`;

const defaultMetaInfo = {
    ogTitle: "Jam",
    ogDescription: "Join this Jam audio space",
    ogUrl: `https://${jamHost}/`,
    ogImage: `https://${jamHost}/img/jam-app-icon.jpg`,
}


const getRoomMetaInfo = async (roomPath) => {
    const roomInfo = (await (await fetch(pantryApiPrefix + roomPath)).json());
    console.log(roomInfo);
    return {
        ogTitle: "Jam - " + roomInfo['name'],
        ogDescription: "Join this Jam audio space - " + roomInfo['description'],
        ogUrl: `https://${jamHost}${roomPath}`,
        ogImage: roomInfo['imageURL'] || `https://${jamHost}/img/jam-app-icon.jpg`,
    }
}

app.use(async (req, res) => {
    console.log(req.path);
    const metaInfo = req.path === '/' ? defaultMetaInfo : {
        ...defaultMetaInfo,
        ...(await getRoomMetaInfo(req.path))
    };

    res.send(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta property="og:title" content="${metaInfo.ogTitle}" />
    <meta property="og:description" content="${metaInfo.ogDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${metaInfo.ogUrl}" />
    <meta
      property="og:image"
      content="${metaInfo.ogImage}"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      rel="shortcut icon"
      type="image/png"
      href="/img/jam-app-icon.jpg"
    />
    <link rel="apple-touch-icon" href="/img/jam-app-icon.jpg" />
    <!-- TODO: move tailwind to build pipeline if we keep it -->
    <link
      href="https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css"
      rel="stylesheet"
    />
    <link
      href="/css/main.css"
      rel="stylesheet"
    />
    <title>Jam</title>
  </head>
  <body>
    <div id="root" class="outer-container"></div>
    <script type="module" src="./bundle.js"></script>
  </body>
</html>
`)
})

module.exports = app;
