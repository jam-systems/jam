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

apply to **[Jam Pro _Early Access_ here](https://forms.ops.jam.systems/pro/)** (Get your own branded version of Jam and use your own custom domain)

join the [Jam community on 🎧 Discord](https://discord.gg/BfakmCuXSX)

follow [Jam on 🐣 Twitter](https://twitter.com/jam_systems)

find [Jam on 😽 Product Hunt](https://www.producthunt.com/posts/jam-d17ff3cc-556c-4c17-8140-5211cb1cd81f)

## Feature Comparison

An overview for how 🍞 Jam compares to similar services like Clubhouse or Twitter Spaces. We intend to keep this table up to date as the services evolve. Please let us know what you care about and how we can make it easier for you to understand whether 🍞 Jam is right for you.

|                                 | 🍞 Jam                 | 👋 Clubhouse      | 🐣 Twitter Spaces          |
|---------------------------------|------------------------|--------------------|----------------------------|
| 🎨 Branded Rooms                | ✅ set your own logo, color   | ❌                | ❌                  |
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

**📱 Android: when Android phone goes to sleep/lockscreen because of inactivity the microphone or sound output might stop working until you unlock the screen**

Workaround: make sure the phone does not go to sleep

**Participants can hear me but I can not hear them**

When participants join a room on 🍞 Jam they start in the _audience_, you can add them to the stage by tapping on them and by tapping the `"invite to stage"` button

## Host Your Own Server

Hosting your own Jam server is easy.

1. Install docker and docker-compose (eg. `apt install docker.io docker-compose`)
2. `git clone https://gitlab.com/jam-systems/jam.git`
3. `cd jam/deployment`
4. `cp .env.example .env`
5. `nano .env` set `JAM_HOST` to your domain
6. In your DNS settings point `${JAM_HOST}`, and `*.${JAM_HOST}` to your IP address (if you don't want a wildcard you need the subdomains `pantry`, `signalhub`, `stun` and `turn`)
7. `docker-compose up -d`

## Develop

In in the `ui` directory use `yarn` to install dependencies and `yarn start` to start the local development server.

Directory overview:

`deployment`/ docker compose file for deploying and hosting of Jam

`pantry`/ a lightweight server for handling authentication and coordination of Jam

`signalhub`/ a simple server for managing WebRTC connections for Jam

`ui`/ web based user interface based on the React framework
