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

<Jam roomId="new-jam-room" />
```

`<Jam>` supports three props:

* `roomId` - **required**, string, your room ID which also makes the room accessible by navigating to `https://jam.systems/<roomId>`.
* `jamUrl` - optional, string, URL of the jam instance. The default is `https://jam.systems` which you may use freely.
* `newRoom` - optional, `{name: string, description: string}`, to customize the room at the moment it is created. (Advanced options that will add way more customizations than the current UI are coming soon.)

Any other props, like `style`, are merged into the top-level `<iframe>` which loads jam. This allows you to add styling, customize `iframe` feature policy etc. Note that Jam needs `allow="microphone"` to work.

Here is a full example for rendering three audio rooms on one page:

```js
import React from 'react';
import Jam from 'jam-react';

function App() {
  let ids = ['01', '02', '03'];
  return (
    <div style={{padding: '1rem'}}>
      <h1>Jam: My own Clubhouse!!!!</h1>
      <div>
        {ids.map(id => (
          <Jam
            key={id}
            roomId={`new-jam-room-${id}`}
            newRoom={{
              name: 'A new Jam Room',
              description: 'This Room was created by a React component',
              color: '#000000',
            }}
            style={{width: '400px', height: '600px'}}
          />
        ))}
      </div>
    </div>
  );
}
```

Result:

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
