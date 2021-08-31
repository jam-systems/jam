# jam-core-react

`jam-core` is client-side JavaScript/TypeScript library for [Jam](https://jam.systems). You can find out more about Jam [on our Gitlab page](https://gitlab.com/jam-systems/jam).

`jam-core-react` is a package that helps integrating `jam-core` in a React app.
You can use it to build custom Jam UIs.

```sh
npm i jam-core-react
```

## Usage

```js
import React, {useState, useEffect} from 'react';
import {render} from 'react-dom';
import {JamProvider, useJam, use} from 'jam-core-react';

const jamConfig = {domain: 'jam.systems'};

// Wrap your app in a Provider
render(
  <JamProvider options={{jamConfig}}>
    <App />
  </JamProvider>,
  document.querySelector('#root')
);

function App() {
  // get Jam state and API methods
  let [state, api] = useJam();

  // listen to specific state changes
  let [myIdentity, roomId] = use(state, ['myIdentity', 'roomId']);

  return (
    <div>
      User: {myIdentity.info.name ?? ''},<br />
      Room: {roomId ?? ''}
    </div>
  );
}
```

The `state` and `api` objects are the same as returned by `createJam()` in `jam-core`. See the [jam-core documentation](https://gitlab.com/jam-systems/jam/-/tree/master/ui/packages/jam-core) for extensive documentation and examples of how to use them.

The additional steps to integrate with React are simple:

- Wrap your App in a `JamProvider`. This will call `createJam()` for you.
- Use the `useJam()` hook to get `state` and `api` in any component inside the Provider
- Use the `use(state, keys)` hook to update the component whenever one of the `keys` in `state` change.

## Example App

We have a complete example for a simple UI built with React: https://gitlab.com/jam-systems/jam/-/blob/master/ui/examples/tiny-jam-react/App.jsx

This example lets users create Jam rooms, share rooms by URL and talk to each other when in the same room -- in less than 100 lines of code.

The example is live on https://tiny-jam-react.vercel.app
