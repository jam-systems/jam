<p align="center">
  <img title='Jam mascot by @eejitlikeme'
       src="https://jam.systems/img/jam.jpg"
       width="300"
       height="300"/>
</p>

# Jam

🍞 Jam is an open source alternative to Clubhouse, Twitter Spaces and similar audio spaces.

With Jam you can create audio rooms that can be used for panel discussions, jam sessions, free flowing conversations, debates, theatre plays, musicals and more. The only limit is your imagination.

try Jam on [https://jam.systems/](https://jam.systems/)

sign up to the **[Jam Pro _Early Access_ Program here](https://pro.jam.systems)** (Get your own branded version of Jam and use your own custom domain)

join the [Jam community on 🎧 Discord](https://discord.gg/BfakmCuXSX)

follow [Jam on 🐣 Twitter](https://twitter.com/jam_systems)

find [Jam on 😽 Product Hunt](https://www.producthunt.com/posts/jam-d17ff3cc-556c-4c17-8140-5211cb1cd81f)

🗓 join our weekly Jam Jam (a Jam where we jam about Jam) every [Wed @ 7pm UTC / 2pm EST](http://jam.systems/jam-jam-ns4a)

add the `/jam` shortcut to your Slack workspace:

<a href="https://slack.com/oauth/v2/authorize?client_id=1827991458162.1827997742338&scope=chat:write,chat:write.public,commands&user_scope="><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack@2x.png" /></a>

add Jam to your [Wordpress](https://medium.com/jam/add-jam-to-wordpress-ca1932cd8ff3), [Webflow](https://medium.com/jam/add-jam-to-webflow-d8a680959007) or [Shopify](https://medium.com/jam/add-jam-to-shopify-a77865cd7b6f):

<a href="https://medium.com/jam/add-jam-to-wordpress-ca1932cd8ff3"><img alt="Add Jam to Wordpress" src="https://s.w.org/style/images/about/WordPress-logotype-standard.png" height="40" /></a> &nbsp;&nbsp;&nbsp; <a href="https://medium.com/jam/add-jam-to-webflow-d8a680959007"><img alt="Add Jam to Webflow" src="https://upload.wikimedia.org/wikipedia/commons/9/92/Webflow_logo.svg" height="22" /></a> &nbsp;&nbsp;&nbsp; <a href="https://medium.com/jam/add-jam-to-shopify-a77865cd7b6f"><img alt="Add Jam to Shopify" src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Shopify_logo_2018.svg/430px-Shopify_logo_2018.svg.png" height="22" /></a>

## Feature Comparison

An overview for how 🍞 Jam compares to similar services like Clubhouse or Twitter Spaces. We intend to keep this table up to date as the services evolve. Please let us know what you care about and how we can make it easier for you to understand whether 🍞 Jam is right for you.

|                                 | 🍞 Jam                 | 👋 Clubhouse      | 🐣 Twitter Spaces          |
|---------------------------------|------------------------|--------------------|----------------------------|
| 🎨 Branded Rooms                | ✅ set your own logo, color   | ❌                | ❌                  |
| 🧩 Embed in your app or website | ✅ iFrame, WebView, JS SDK    | ❌                | ❌                  |
| 💯 Animated Reactions           | ✅ (❤️ 💯 😂 😅 😳 🤔)| ❌                | ✅ (💯 ✋ ✊ ✌️ 👋)       |
| 📎 Description w/ Links         | ✅ w/ Markdown support | ❌                | ☑️ show tweets              |
| 💵 Earn Money                   | ✅ dedicated support for<br/>PayPal.me, Bitcoin:, Gumroad | ❌ no built in support<br/><br/>currently not allowed<br/>unless specifically authorized<br/> see Terms of Service<br/>[(Conditions of Use #9)](https://www.notion.so/Terms-of-Service-cfbd1824d4704e1fa4a83f0312b8cf88) | ❌  no built in support |
| 📱 Platform support             | ✅ Web, iOS, Android,<br/>macOS, Windows, Linux, … | ☑️ iOS App Store & invite | ☑️ iOS App Store & invite |
| 🌏 [Data Sovereignty](https://en.wikipedia.org/wiki/Data_sovereignty) | ☑️ EU 🇪🇺 (Frankfurt, Germany 🇩🇪)<br/><br/> ✅ open source, host wherever you want | ☑️ USA 🇺🇸, China 🇨🇳 (Audio API Provider)<br/><br/>❌ proprietary, no self-hosting   | ☑️ USA 🇺🇸 (?)<br/><br/>❌ proprietary, no self-hosting |
| 🎙 Number of Speakers in a Room | ✅ ~ 15+ (limited by p2p bandwidth) | ✅ ~ 100s (?) | ☑️ 10             |
| 🎫 Number of People in a Room   | ☑️ ~ 30+ (limited by p2p bandwidth),<br/>we're working on lifting this limit!<br/><br/>current workaround: stream browser tab to<br/>Youtube, Twitch, Facebook Live … | ✅ ~ 8000     | ✅ ~ millions (?) |
| 🗓 Discovery                    | ☑️ off-platform (social networks, messengers) | ✅ hallway, upcoming events, off-platform | ✅ fleet bar, off-platform |

💯 Animated Reactions (🎬 [see a demo](https://twitter.com/__tosh/status/1362558104412565504/video/1))

🎨 Branded Rooms: set a picture and a color for your room

💵 Earn Money: dedicated support for linkinging to off-platform services to charge money or sell your own products


## Known Issues and Solutions

**📱 iPhone: audio output sometimes switches randomly between loudspeaker and earspeaker.**

Workaround: use bluetooth or cable headphones, this way audio will always go through the headphones.

**📱 iPhone & Android: when phone goes to sleep/lockscreen because of inactivity the microphone or sound output might stop working until you unlock the screen again**

Workaround: make sure you are using Jam in the standalone browser instead of within a webview

**Participants can hear me but I can not hear them**

When participants join a room on 🍞 Jam they start in the _audience_, you can add them to the stage by tapping on them and by tapping the `"invite to stage"` button

## Host Your Own Server

Hosting your own Jam server is easy.

### Minimum Requirements

To run your own Jam instance we recommend a minimum of 512 MB RAM and a 1GHz CPU.

e.g.: a Raspberry Pi Zero (512 MB RAM) or the smallest [Digital Ocean Basic Droplet (1 GB RAM)](https://www.digitalocean.com/pricing/) or the smallest [Linode shared plan (1 GB RAM)](https://www.linode.com/pricing/) should be enough to get started.

### Install

1. Install docker and docker-compose (eg. `apt install docker.io docker-compose`)
1. `git clone https://gitlab.com/jam-systems/jam.git`
1. `cd jam`
1. `git checkout stable`  
1. `cd deployment`
1. `cp .env.example .env`
1. `nano .env` set `JAM_HOST` to your domain
1. In your DNS settings point `${JAM_HOST}`, and `*.${JAM_HOST}` to your IP address (if you don't want a wildcard you need the subdomains `stun` and `turn` (e.g. stun.jam.example.com and turn.jam.example.com))
1. If you are behind a NAT:
   1. Open ports 3478 and 3480, both TCP and UDP, and 80 and 443, TCP, on your firewall
   1. `nano turnserver.conf` set `realm` to your domain. If you are running coturn behind NAT, you may need to add the parameter  `external-ip` and give it the value of your public IP address.
1. `docker-compose up -d`

### Update

1. `cd jam/deployment`
2. `git checkout stable`
3. `git pull`
4. `docker-compose pull`
5. `docker-compose up -d`

## Develop

In in the `ui` directory use `yarn` to install dependencies and `yarn start` to start the local development server.

Directory overview:

`deployment`/ docker compose file for deploying and hosting of Jam

`pantry`/ a lightweight server for handling authentication and coordination of Jam

`signalhub`/ a simple server for managing WebRTC connections for Jam

`ui`/ web based user interface based on the React framework


## Buy Us ☕

**BTC:** 3HM1zPtLuwCGarbihNYVjFVwbFrFe9keqh

**ETH:** 0xe15265b2a309f0d20038e10b8df5a12fb5e916f8
