import React, {useMemo} from 'react';
import {render} from 'react-dom';
import {usePath} from './lib/use-location';
import Jam from './Jam';
import Start from './views/Start';
import { parseUrlHash } from './lib/url-utils';

render(<App />, document.querySelector('#root'));

function App() {


  // detect roomId from URL
  const [roomId = null] = usePath();

  const urlData = useMemo(
      parseUrlHash,
      [roomId]
  )

  if(roomId != null) {
      importRoomIdentity(roomId, urlData.identity, urldata.keys);
  }


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

