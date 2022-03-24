import React, {createElement, useMemo, useState, useEffect} from 'react';
import Room from './Room';
import {importRoomIdentity} from '../jam-core';
import {useJam} from '../jam-core-react';
import StartFromURL from './StartFromURL';
import {use} from 'use-minimal-state';

export default function PossibleRoom({
  roomId, // truthy
  newRoom,
  roomIdentity,
  roomIdentityKeys,
  onError,
  autoCreate,
  uxConfig,
}) {
  const [state, {enterRoom}] = useJam();
  let [room, hasRoom, isLoading, _roomId] = use(state, [
    'room',
    'hasRoom',
    'isRoomLoading',
    'roomId',
  ]);
  isLoading = isLoading || _roomId === null;

  // import room identity
  // this has to be done BEFORE creating new room so that we can be moderator
  let importIdentityPromise = useMemo(() => {
    if (roomIdentity || roomIdentityKeys) {
      return importRoomIdentity(roomId, {
        ...roomIdentityKeys,
        info: roomIdentity,
      });
    }
  }, [roomId, roomIdentity, roomIdentityKeys]);

  // if room does not exist && autoCreate is on, try to create new one
  let shouldCreate = !hasRoom && autoCreate && !isLoading;
  let [autoCreateLoading, autoCreateError] = useCreateRoom({
    roomId,
    newRoom,
    shouldCreate,
    promiseToAwait: importIdentityPromise,
    onSuccess: () => enterRoom(roomId),
  });

  if (isLoading) return null;
  if (hasRoom) return <Room key={roomId} {...{room, roomId, uxConfig}} />;
  if (shouldCreate && autoCreateLoading) return null;

  if (roomId.length < 4 || (shouldCreate && autoCreateError)) {
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

function useCreateRoom({
  roomId,
  shouldCreate,
  newRoom,
  promiseToAwait,
  onSuccess,
}) {
  const [, {createRoom}] = useJam();
  let [isError, setError] = useState(false);
  let [isLoading, setLoading] = useState(true);
  useEffect(() => {
    if (roomId && shouldCreate) {
      (async () => {
        await promiseToAwait;
        let ok = await createRoom(roomId, newRoom);
        setLoading(false);
        if (ok) onSuccess?.();
        else setError(true);
      })();
    }
  }, [roomId, shouldCreate]);
  return [isLoading, isError];
}
