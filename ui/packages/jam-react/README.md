<p align="center">
  <img title='Jam mascot by @eejitlikeme'
       src="https://jam.systems/img/jam.jpg"
       width="300"
       height="300"/>
</p>

# jam-react

Jam is your own embeddable Clubhouse-style audio space. This package exposes Jam as a standalone React component.

```sh
yarn add jam-react
```

Usage:

```js
import Jam from 'jam-react';

<Jam roomId="new-jam-room" />;
```

`<Jam>` supports three props:

- `roomId` - **required**, string, your room ID which also makes the room accessible by navigating to `https://jam.systems/<roomId>`.
- `jamUrl` - optional, string, URL of the jam instance. The default is `https://jam.systems` which you may use freely.
- `params` - optional, allows many customizations that are documented [here](https://gitlab.com/jam-systems/jam#room-configuration-via-url).

Any other props, like `style`, are merged into the top-level `<iframe>` which loads jam. This allows you to add styling, customize `iframe` feature policy etc. Note that Jam needs `allow="microphone"` to work.

Here is a full example with customizations, including setting an identity for the user from outside:

```js
import React from 'react';
import Jam from 'jam-react';

function App() {
  return (
    <div style={{padding: '1rem'}}>
      <h1>Jam: My own Clubhouse!!!!</h1>
      <Jam
        jamUrl="http://beta.jam.systems"
        roomId="klubhaus-123456"
        params={{
          room: {
            name: 'A new Jam Room',
            description: 'This Room was created by a React component',
            color: '#000000',
            stageOnly: true,
          },
          ux: {
            autoCreate: false,
            autoJoin: true,
          },
          identity: {
            name: 'Gregor',
            avatar: 'https://avatars.githubusercontent.com/u/20989968',
          },
        }}
        style={{width: '400px', height: '600px', border: 'none'}}
      />
    </div>
  );
}
```

And here is an example with three `<Jam>` components rendered next to each other:

<p align="center">
  <img src="https://i.imgur.com/nmYENw9.png"
       width="900"/>
</p>

## About Jam

🍞 Jam is an open source alternative to Clubhouse, Twitter Spaces and similar audio spaces.

With Jam you can create audio rooms that can be used for panel discussions, jam sessions, free flowing conversations, debates, theatre plays, musicals and more. The only limit is your imagination.

Try Jam on [https://jam.systems/](https://jam.systems/)

Find out more about Jam at our [Gitlab repository](https://gitlab.com/jam-systems/jam/).

## Buy Us ☕

**BTC:** 3HM1zPtLuwCGarbihNYVjFVwbFrFe9keqh

**ETH:** 0xe15265b2a309f0d20038e10b8df5a12fb5e916f8
