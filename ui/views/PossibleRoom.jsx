import React, {createElement, useMemo} from 'react';
import Room from './Room';
import {importRoomIdentity} from '../jam-core';
import {useJam, useRoom} from '../jam-core-react';
import StartFromURL from './StartFromURL';
import {use} from 'use-minimal-state';

export default function PossibleRoom({
  roomId, // truthy
  newRoom,
  roomIdentity,
  roomIdentityKeys,
  onError,
}) {
  const [state] = useJam();

  // fetch room
  let actualRoom = use(state, 'room');
  let [room, isLoading] = useRoom(roomId);

  // import room identity
  // this has to be done BEFORE creating new room so that we can be moderator
  useMemo(() => {
    if (roomIdentity) {
      importRoomIdentity(roomId, roomIdentity, roomIdentityKeys);
    }
  }, [roomId, roomIdentity, roomIdentityKeys]);

  // if room does not exist, try to create new one
  // let [roomFromURILoading, roomFromURIError] = useCreateRoom({
  //   roomId,
  //   room,
  //   isLoading,
  //   newRoom,
  //   onSuccess: () => enterRoom(roomId),
  // });

  if (isLoading) return null;
  if (room)
    return (
      <Room
        key={roomId}
        {...{room: actualRoom, roomId, roomIdentity, roomIdentityKeys}}
      />
    );

  if (roomId.length < 4) {
    return typeof onError === 'function'
      ? createElement(onError, {roomId, error: {createRoom: true}})
      : onError || <Error />;
  }

  return <StartFromURL {...{roomId, newRoom}} />;
}

// TODO
function Error() {
  return <div>An error ocurred</div>;
}
