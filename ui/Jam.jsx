import React, {createElement, useEffect, useLayoutEffect, useMemo} from 'react';
import Room from './views/Room';
import {currentId} from './logic/identity';
import {useCreateRoom, initializeIdentity} from './logic/backend';
import {useRoom, maybeConnectRoom, disconnectRoom} from './logic/room';
import Modals from './views/Modal';
import state, {swarm} from './logic/state';
import {mergeClasses, useSync} from './logic/util';
import {stopAudio} from './logic/audio';
import {config} from './logic/config';
import {useProvideWidth, WidthContext} from './logic/tailwind-mqp';
import {set, use} from 'use-minimal-state';

export default function Jam({
  style,
  className,
  roomId,
  newRoom,
  config,
  onError,
  ...props
}) {
  useSync(state, {roomId}, [roomId]);
  let {color} = use(state, 'room');
  let [width, , setContainer, mqp] = useProvideWidth();
  let backgroundColor = useMemo(
    () => (color && color !== '#4B5563' ? hexToRGB(color, '0.123') : undefined),
    [color]
  );

  return (
    <div
      ref={el => setContainer(el)}
      className={mqp(mergeClasses('jam sm:pt-12', className), width)}
      style={{
        position: 'relative',
        height: '100%',
        minHeight: '-webkit-fill-available',
        backgroundColor,
        ...(style || null),
      }}
      {...props}
    >
      <WidthContext.Provider value={width}>
        <Main {...{roomId, newRoom, config, onError}} />
        <Modals />
      </WidthContext.Provider>
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
    swarm.config({myPeerId: currentId()});
    set(swarm, 'sharedState', {inRoom: false});
  }, []);

  // fetch room if we are in one
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

function hexToRGB(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  if (alpha) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else {
    return `rgb(${r}, ${g}, ${b})`;
  }
}
