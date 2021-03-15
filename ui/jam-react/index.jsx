import React, {useEffect, useState, useMemo} from 'react';
import {enterRoom} from '../logic/main';
import Room from '../views/Room';
import identity from '../logic/identity';
import {createRoom, updateApiQuery, initializeIdentity} from '../logic/backend';
import {useRoom, maybeConnectRoom, disconnectRoom} from '../logic/room';
import swarm from '../lib/swarm';
import Modals from '../views/Modal';
import {set} from 'use-minimal-state';
import {config} from '../logic/config';
import {debug} from '../logic/util';

debug(config);
set(config, {
  pantryUrl: 'https://beta.jam.systems/_/pantry',
  signalHubUrl: 'https://beta.jam.systems/_/signalhub',
});

// UGLY HACK: inject css

// TODO properly include tailwind in build pipeline
let twLink = document.createElement('link');
twLink.rel = 'stylesheet';
twLink.href = 'https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css';
document.head.appendChild(twLink);
// TODO bundle css properly
let customCssLink = document.createElement('link');
customCssLink.rel = 'stylesheet';
customCssLink.href = 'https://jam.systems/css/main.css';
document.head.appendChild(customCssLink);

export default function Jam(props) {
  return (
    <>
      <App {...props} />
      <Modals />
    </>
  );
}

function App({
  roomId,
  config: customConfig,
  name,
  description,
  color,
  logoURI,
}) {
  useMemo(() => {
    if (customConfig) set(config, customConfig);
  }, []);

  // initialize identity
  useEffect(() => {
    initializeIdentity();
    swarm.config({myPeerId: identity.publicKey});
    swarm.set('sharedState', {inRoom: false});
  }, []);

  // detect roomId & fetch room if we are in one
  let [room, isLoading] = useRoom(roomId);

  // connect to signalhub if room exists (and not already connected)
  useEffect(() => {
    if (room) maybeConnectRoom(roomId);
    if (!room) disconnectRoom();
  }, [room, roomId]);

  let [roomFromURIError, setRoomFromURIError] = useState(false);
  let [isCreateLoading, setCreateLoading] = useState(true);

  // if roomId is present but room does not exist, try to create new one
  useEffect(() => {
    if (roomId && !room && !isLoading) {
      (async () => {
        let roomCreated = await createRoom(
          roomId,
          name || '',
          description || '',
          logoURI || '',
          color || '',
          swarm.myPeerId
        );
        setCreateLoading(false);
        if (roomCreated) {
          updateApiQuery(`/rooms/${roomId}`, roomCreated);
          enterRoom(roomId);
        } else {
          setRoomFromURIError(true);
        }
      })();
    }
  }, [room, roomId, isLoading]);

  if (roomId) {
    if (isLoading) return null;
    if (room) return <Room room={room} roomId={roomId} />;
    if (isCreateLoading) return null;
  }
  return <Error />;
}

// TODO
function Error() {
  return <div>An error ocurred</div>;
}
