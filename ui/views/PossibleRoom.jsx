import React, {createElement, useMemo} from 'react';
import Room from './Room';
import {
  useRoom,
  useCreateRoom,
  enterRoom,
  importRoomIdentity,
} from '../jam-core';

export default function PossibleRoom({
  roomId, // truthy
  newRoom,
  roomIdentity,
  roomIdentityKeys,
  onError,
}) {
  // fetch room
  let [room, isLoading] = useRoom(roomId);

  // import room identity
  // this has to be done BEFORE creating new room so that we can be moderator
  useMemo(() => {
    if (roomIdentity) {
      importRoomIdentity(roomId, roomIdentity, roomIdentityKeys);
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
