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
    <title>Jam</title>
    <style>
      body {
        width: 100%;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
          'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
          'Helvetica Neue', sans-serif;
        background-color: rgb(250, 245, 239);
      }
      .outer-container {
        height: 100vh;
        padding-top: 50px;
      }
      .container {
        width: 700px;
        margin: 0 auto;
        padding: 13px;
        height: 100%;
        border-radius: 30px 30px 0 0;
        border: 2px solid lightgrey;
        border-bottom: 0;
        background: white;
      }

      .navigation {
        margin-left: -15px; /* compensate for padding from outer div (?) */
        width: 700px;
        border: 2px solid lightgrey;
        border-bottom: 0;
        flex: none;
      }

      /* markdown styling */
      .markdown a {
        text-decoration: underline;
        color: rgba(30, 64, 175); /* blue-800 */
      }

      /* bazaar */
      a[href^="https://gumroad.com"]
      {
        background-image: url('/img/bazaar/gumroad-logo.svg');
        background-repeat: no-repeat;
        padding-left: 23px;
        text-decoration: underline;
      }

      a[href^="https://paypal.me"]
      {
        background-image: url('/img/bazaar/paypal-logo.svg');
        background-repeat: no-repeat;
        padding-left: 23px;
        text-decoration: underline;
      }

      a[href^="bitcoin:"] {
        background-image: url("/img/bazaar/bitcoin-logo.svg");
        background-repeat: no-repeat;
        background-size: 18px;
        padding-left: 23px;
        text-decoration: underline;
      }

      h1,
      h2,
      h3 {
        color: black;
        width: 100%;
        font-weight: normal;
      }
      h1 {
        font-size: 24px;
      }
      h2 {
        color: #9c9c9c;
        font-size: 20px;
        margin: -4% 0 6% 0;
      }
      input, textarea {
        padding: 10px;
        font-size: 18px;
        border: 0;
        border-radius: 3px;
        border: 1px solid rgb(213, 213, 213);
      }
      input[type=color] {
        padding: 0;
      }
      table td {
        padding: 0;
        border: 5px solid transparent;
        vertical-align: top;
      }

      .human-radius {
        border-radius: 42%;
      }

      @media (max-width: 640px) {
        .container {
          width: 100%;
          border: 0px;
          box-sizing: border-box;
        }

        .navigation {
          width: 100%;
          border-top: 2px;
          border-right: 0;
          border-bottom: 0;
          border-left: 0;
          padding: 0;
          margin-left: 0; /* remove negative margin left from desktop view? */

          box-sizing: border-box;
        }
      }
    </style>
  </head>
  <body>
    <div id="root" class="outer-container"></div>
    <script type="module" src="./bundle.js"></script>
  </body>
</html>
`)
})

module.exports = app;
