import React, {useLayoutEffect, useState} from 'react';
import state from '../logic/state';
import {use} from 'use-minimal-state';
import swarm from '../lib/swarm';
import EnterRoom from './EnterRoom';
import RoomHeader from './RoomHeader';
import identity from '../logic/identity';
import {openModal} from './Modal';
import {EditRoomModal} from './EditRoom';
import useWakeLock from '../lib/use-wake-lock';
import {AudienceAvatar, StageAvatar} from './Avatar';
import {useMqParser} from '../logic/tailwind-mqp';
import Container from './Container';
import Navigation from './Navigation';

export default function Room({room, roomId}) {
  // room = {name, description, moderators: [peerId], speakers: [peerId]}
  useWakeLock();
  let myInfo = use(identity, 'info');
  let [
    reactions,
    raisedHands,
    identities,
    speaking,
    iSpeak,
    iModerate,
  ] = use(state, [
    'reactions',
    'raisedHands',
    'identities',
    'speaking',
    'iAmSpeaker',
    'iAmModerator',
  ]);
  let [peers, peerState, sharedState] = use(swarm, [
    'stickyPeers',
    'peerState',
    'sharedState',
  ]);

  let hasEnteredRoom = sharedState?.inRoom;

  let [editRole, setEditRole] = useState(null);
  let [editSelf, setEditSelf] = useState(false);

  let {
    name,
    description,
    logoURI,
    buttonURI,
    buttonText,
    color,
    speakers,
    moderators,
    closed,
  } = room || {};

  useLayoutEffect(() => {
    if (color && color !== '#4B5563') {
      let outer = document.getElementById('outer-container');
      if (outer) {
        outer.style.backgroundColor = hexToRGB(color, '0.123');
      }
    }
  }, [color]);

  let mqp = useMqParser();

  if (!iModerate && closed) {
    return (
      <EnterRoom
        roomId={roomId}
        name={name}
        description={description}
        logoURI={logoURI}
        closed={closed}
        buttonURI={buttonURI}
        buttonText={buttonText}
      />
    );
  }

  if (!hasEnteredRoom) {
    return (
      <EnterRoom
        roomId={roomId}
        name={name}
        description={description}
        logoURI={logoURI}
      />
    );
  }

  let myPeerId = identity.publicKey;
  let stagePeers = (speakers || []).filter(id => id in peers);
  let audiencePeers = Object.keys(peers || {}).filter(
    id => !stagePeers.includes(id)
  );

  let myHandRaised = raisedHands.has(myPeerId);

  return (
    <Container style={{display: 'flex', flexDirection: 'column'}}>
      <div
        className={mqp('flex flex-col pt-2 md:pt-10 md:p-10')}
        style={{flex: '1', overflowY: 'auto', minHeight: '0'}}
      >
        <div
          className={
            closed
              ? 'rounded bg-blue-50 border border-blue-150 text-gray-600 ml-2 p-3 mb-3 inline text-center'
              : 'hidden'
          }
        >
          {/*  heroicons/exclamation-circle */}
          <svg
            className="w-5 h-5 inline mr-2 -mt-1"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Room is closed
        </div>
        <RoomHeader
          {...{name, description, logoURI, buttonURI, buttonText}}
          editRoom={
            iModerate && (() => openModal(EditRoomModal, {roomId, room}))
          }
        />

        {/* Main Area */}
        <div className="">
          {/* Stage */}
          <div className="">
            <ol className="flex flex-wrap">
              {iSpeak && (
                <StageAvatar
                  key={myPeerId}
                  peerId={myPeerId}
                  {...{speaking, moderators, reactions}}
                  peerState={sharedState}
                  info={myInfo}
                  // onClick={() => openModal(EditIdentity)}
                  onClick={() => setEditSelf(true)}
                />
              )}
              {stagePeers.map(peerId => (
                <StageAvatar
                  key={peerId}
                  {...{speaking, moderators}}
                  {...{peerId, peerState, reactions}}
                  peerState={peerState[peerId]}
                  info={identities[peerId]}
                  onClick={iModerate ? () => setEditRole(peerId) : undefined}
                />
              ))}
            </ol>
          </div>

          <br />
          {/* Audience */}
          <h3 className="text-gray-400 pl-4 pb-4">Audience</h3>
          <ol className="flex flex-wrap">
            {!iSpeak && (
              <AudienceAvatar
                {...{reactions}}
                peerId={myPeerId}
                peerState={sharedState}
                info={myInfo}
                handRaised={myHandRaised}
                // onClick={() => openModal(EditIdentity)}
                onClick={() => setEditSelf(true)}
              />
            )}
            {audiencePeers.map(peerId => (
              <AudienceAvatar
                key={peerId}
                {...{peerId, peerState, reactions}}
                peerState={peerState[peerId]}
                info={identities[peerId]}
                handRaised={iModerate && raisedHands.has(peerId)}
                onClick={iModerate ? () => setEditRole(peerId) : undefined}
              />
            ))}
          </ol>
        </div>

        <div style={{height: '136px', flex: 'none'}} />
      </div>

      <Navigation
        {...{roomId, room, editRole, setEditRole, editSelf, setEditSelf}}
      />
    </Container>
  );
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
