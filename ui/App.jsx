import React, {useEffect, useMemo} from 'react';
import {render} from 'react-dom';
import {usePath} from './lib/use-location';
import Jam from './Jam';
import Start from './views/Start';
import {parseUrlHash} from './lib/url-utils';
import {importRoomIdentity} from './logic/identity';

render(<App />, document.querySelector('#root'));

function App() {
  // detect roomId from URL
  const [roomId = null] = usePath();

  const urlData = useMemo(parseUrlHash, [roomId]);

  useEffect(() => {
    if (roomId !== null) {
      importRoomIdentity(roomId, urlData.identity, urlData.keys);
    }
  }, [roomId]);

  return (
    <Jam
      style={{height: '100vh'}}
      roomId={roomId}
      newRoom={urlData.room}
      onError={({error}) => {
        return (
          <Start urlRoomId={roomId} roomFromURIError={!!error.createRoom} />
        );
      }}
    />
  );
}
