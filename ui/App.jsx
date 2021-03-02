import React, {useEffect, useState} from 'react';
import {render} from 'react-dom';
import Start from './views/Start.jsx';
import Room from './views/Room.jsx';
import './logic/main';

import identity, {initializeIdentity} from './logic/identity';
import {updateApiQuery, useApiQuery} from './logic/backend.js';
import {createRoom} from './logic/backend';
import {usePath} from './lib/use-location.js';
import {navigate} from './lib/use-location';
import {connectRoom} from './logic/room';
import swarm from './lib/swarm.js';
import Modals from './views/Modal.jsx';
import {enterRoom} from './logic/main';

render(
  <>
    <App />
    <Modals />
  </>,
  document.querySelector('#root')
);

function App() {
  // initialize identity
  useEffect(() => {
    initializeIdentity();
    swarm.config({myPeerId: identity.publicKey});
    swarm.set('sharedState', {inRoom: false});
  }, []);

  // detect roomId & fetch room if we are in one
  const [roomId] = usePath();
  let [room, isLoading] = useApiQuery(`/rooms/${roomId}`, !!roomId);

  // connect to signalhub if room exists
  useEffect(() => {
    if (room) {
      console.log('connecting', roomId);
      connectRoom(roomId);
      return () => swarm.disconnect();
    }
  }, [room, roomId]);

  let [roomFromURIError, setRoomFromURIError] = useState(false);
  let [isPostLoading, setPostLoading] = useState(true);

  // if roomId is present but room does not exist, try to create new one
  useEffect(() => {
    if (roomId && !room && !isLoading) {
      let roomConfigHash = location.hash;
      let roomConfig;
      if (roomConfigHash) {
        roomConfig = parseParams(decodeURI(roomConfigHash.slice(1)));
      }
      (async () => {
        let roomCreated = await createRoom(
          roomId,
          roomConfig?.name || '',
          roomConfig?.description || '',
          roomConfig?.logoURI || '',
          roomConfig?.color || '',
          swarm.myPeerId
        );
        setPostLoading(false);
        if (roomCreated) {
          updateApiQuery(`/rooms/${roomId}`, roomCreated, 200);
          navigate('/' + roomId);
          enterRoom();
        } else {
          setRoomFromURIError(true);
        }
      })();
    }
  }, [room, roomId, isLoading]);

  if (roomId) {
    if (isLoading) return null;
    if (room) return <Room room={room} roomId={roomId} />;
    if (isPostLoading) return null;
  }
  return <Start urlRoomId={roomId} roomFromURIError={roomFromURIError} />;
}

function parseParams(params) {
  let res = params.split('&').reduce(function (res, item) {
    var parts = item.split('=');
    res[parts[0]] = parts[1];
    return res;
  }, {});
  return res;
}
