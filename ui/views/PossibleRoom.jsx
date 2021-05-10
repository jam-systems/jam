import React, {createElement, useMemo} from 'react';
import Room from './Room';
import {initializeIdentity, useCreateRoom} from '../logic/backend';
import {useRoom} from '../logic/room';
import state from '../logic/state';
import {useSync} from '../logic/util';
import {importRoomIdentity} from '../logic/identity';
import {enterRoom} from '../logic/main';

export default function PossibleRoom({
  roomId, // truthy
  newRoom,
  roomIdentity,
  roomIdentityKeys,
  onError,
}) {
  useSync(state, {roomId}, [roomId]);

  // fetch room
  let [room, isLoading] = useRoom(roomId);

  // import room identity
  // this has to be done BEFORE creating new room so that we can be moderator
  useMemo(() => {
    if (roomIdentity) {
      importRoomIdentity(roomId, roomIdentity, roomIdentityKeys);
      initializeIdentity(roomId);
    }
  }, [roomId, roomIdentity, roomIdentityKeys]);

  // if room does not exist, try to create new one
  let [roomFromURILoading, roomFromURIError] = useCreateRoom({
    roomId,
    room,
    isLoading,
    newRoom,
    onSuccess: () => enterRoom(roomId),
  });

  if (isLoading) return null;
  if (room)
    return (
      <Room key={roomId} {...{room, roomId, roomIdentity, roomIdentityKeys}} />
    );
  if (roomFromURILoading) return null;

  // TODO: could be nice to document possible errors
  let error = roomFromURIError ? {createRoom: true} : {};
  return typeof onError === 'function'
    ? createElement(onError, {roomId, error})
    : onError || <Error />;
}

// TODO
function Error() {
  return <div>An error ocurred</div>;
}
