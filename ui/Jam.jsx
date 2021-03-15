import React, {createElement, useEffect, useMemo} from 'react';
import Room from './views/Room';
import identity from './logic/identity';
import {useCreateRoom, initializeIdentity} from './logic/backend';
import {useRoom, maybeConnectRoom, disconnectRoom} from './logic/room';
import swarm from './lib/swarm';
import Modals from './views/Modal';
import state from './logic/state';
import {useSync} from './logic/util';
import {stopAudio} from './logic/audio';
import {config} from './logic/config';
import {set} from 'minimal-state';

export default function Jam({
  style,
  roomId,
  newRoom,
  config,
  onError,
  ...props
}) {
  return (
    <div style={{position: 'relative', ...(style || null)}} {...props}>
      <Main {...{roomId, newRoom, config, onError}} />
      <Modals />
    </div>
  );
}

function Main({roomId, newRoom, config: customConfig, onError}) {
  useMemo(() => {
    if (customConfig) set(config, customConfig);
  }, []); // TODO: make this react to config changes

  // initialize identity
  useEffect(() => {
    initializeIdentity();
    swarm.config({myPeerId: identity.publicKey});
    swarm.set('sharedState', {inRoom: false});
  }, []);

  // fetch room if we are in one
  useSync(state, {roomId}, [roomId]);
  let [room, isLoading] = useRoom(roomId);

  // connect to signalhub if room exists (and not already connected)
  useEffect(() => {
    if (room) maybeConnectRoom(roomId);
    if (!room && roomId) disconnectRoom(roomId);
  }, [room, roomId]);
  // clean up on navigating away
  useEffect(() => {
    if (roomId) {
      return () => {
        disconnectRoom(roomId);
        stopAudio();
      };
    }
  }, [roomId]);

  // if roomId is present but room does not exist, try to create new one
  let [roomFromURILoading, roomFromURIError] = useCreateRoom({
    roomId,
    room,
    isLoading,
    newRoom,
  });

  if (roomId) {
    if (isLoading) return null;
    if (room) return <Room room={room} roomId={roomId} />;
    if (roomFromURILoading) return null;
  }
  // TODO: could be nice to document possible errors
  let error = !roomId
    ? {noRoomId: true}
    : roomFromURIError
    ? {createRoom: true}
    : {};
  return typeof onError === 'function'
    ? createElement(onError, {roomId, error})
    : onError || <Error />;
}

// TODO
function Error() {
  return <div>An error ocurred</div>;
}
