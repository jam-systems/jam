import React, {useEffect} from 'react';
import {render} from 'react-dom';
import Start from './views/Start.jsx';
import Room from './views/Room.jsx';
import './logic/main';
import {enterRoom} from './logic/main';

import identity, {initializeIdentity} from './logic/identity';
import {useApiQuery} from './logic/backend.js';
import {createRoom} from './logic/backend';
import {usePath} from './lib/use-location.js';
import {navigate} from './lib/use-location';
import {connectRoom} from './logic/room';
import swarm from './lib/swarm.js';
import Modals from './views/Modal.jsx';

render(<App />, document.querySelector('#root'));

function App() {
  // initialize identity
  useEffect(() => {
    initializeIdentity();
    swarm.config({myPeerId: identity.publicKey});
    swarm.set('sharedState', {inRoom: false});
  }, []);

  // detect roomId & connect to signalhub
  const [roomId] = usePath();
  useEffect(() => {
    if (roomId) {
      connectRoom(roomId);
      return () => swarm.disconnect();
    }
  }, [roomId]);
  // fetch room if we are in one
  let [room, isLoading] = useApiQuery(`/rooms/${roomId}`, !!roomId);

  let Main;

  if (roomId) {
    if (isLoading) Main = null;
    else if (room) {
      Main = <Room room={room} roomId={roomId} />;
    } else {
      console.log("no room");
      console.log(roomId);
      let roomConfigHash = window.location.hash;
      let roomConfig;
      console.log(roomId);
      console.log(roomConfigHash);

      if (roomConfigHash) {
        let parseParams = params => {
          let res = params.split('&').reduce(function (res, item) {
            var parts = item.split('=');
            res[parts[0]] = parts[1];
            return res;
          }, {});
          return res;
        };

        roomConfig = parseParams(decodeURI(roomConfigHash.substring(1)));
        console.log(roomConfig);
      }

      (async () => {
        let roomCreated = await createRoom(
          roomId,
          (roomConfig?.name || ''),
          (roomConfig?.description || ''),
          (roomConfig?.logoURI || ''),
          (roomConfig?.color || ''),
          swarm.myPeerId
        );
        if(roomCreated) {
          console.log('room created, redirecting');
          window.location.href = location.href.replace(location.hash,"")
        } else {
          console.log('room not created');
          setRoomFromURIError(true);
        }
      })();
    }
  }
  if (Main === undefined) Main = <Start urlRoomId={roomId} />;

  return (
    <>
      {Main}
      <Modals />
    </>
  );
}
