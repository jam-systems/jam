import React, {useMemo} from 'react';
import {render} from 'react-dom';
import {usePath} from './lib/use-location';
import Jam from './Jam';
import Start from './views/Start';

render(<App />, document.querySelector('#root'));

function App() {
  // detect roomId from URL
  const [roomId = null] = usePath();

  // detect new room config from URL
  let newRoom = useMemo(
    () => (location.hash ? parseParams(location.hash.slice(1)) : undefined),
    [roomId] // don't worry, this is fine
  );

  return (
    <Jam
      className="outer-container"
      roomId={roomId}
      newRoom={newRoom}
      onError={({error}) => {
        return (
          <Start urlRoomId={roomId} roomFromURIError={!!error.createRoom} />
        );
      }}
    />
  );
}

function parseParams(params) {
  params = decodeURI(params);
  let res = params.split('&').reduce(function (res, item) {
    var parts = item.split('=');
    res[parts[0]] = parts[1];
    return res;
  }, {});
  return res;
}
