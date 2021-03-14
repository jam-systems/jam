import React, {useEffect, useState} from 'react';
import {enterRoom} from '../logic/main';
import Start from '../views/Start';
import Room from '../views/Room';
import identity from '../logic/identity';
import {createRoom, updateApiQuery, initializeIdentity} from '../logic/backend';
import {usePath, navigate} from '../lib/use-location';
import {useRoom, maybeConnectRoom, disconnectRoom} from '../logic/room';
import swarm from '../lib/swarm';
import Modals from '../views/Modal';

export default function Jam() {
  return (
    <>
      <App />
      <Modals />
    </>
  );
}

function App({roomId}) {
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
        setCreateLoading(false);
        if (roomCreated) {
          updateApiQuery(`/rooms/${roomId}`, roomCreated);
          navigate('/' + roomId);
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
