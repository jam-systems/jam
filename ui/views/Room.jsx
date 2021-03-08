import React, {useLayoutEffect, useMemo, useState} from 'react';
import {leaveRoom} from '../logic/main';
import state from '../logic/state';
import {use} from 'use-minimal-state';
import swarm from '../lib/swarm';
import EnterRoom from './EnterRoom';
import RoomHeader from './RoomHeader';
import copyToClipboard from '../lib/copy-to-clipboard';
import identity from '../logic/identity';
import {openModal} from './Modal';
import {EditRoomModal} from './EditRoom';
import useWakeLock from '../lib/use-wake-lock';
import {sendReaction, raiseHand} from '../logic/reactions';
import EditRole, {EditSelf} from './EditRole';
import {AudienceAvatar, StageAvatar} from './Avatar';
import {leaveStage} from '../logic/room';

const reactionEmojis = ['❤️', '💯', '😂', '😅', '😳', '🤔'];

export default function Room({room, roomId}) {
  // room = {name, description, moderators: [peerId], speakers: [peerId]}
  useWakeLock();
  let myInfo = use(identity, 'info');
  let [
    myAudio,
    micMuted,
    reactions,
    raisedHands,
    identities,
    speaking,
    iSpeak,
    iModerate,
  ] = use(state, [
    'myAudio',
    'micMuted',
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

  let micOn = myAudio?.active;
  let hasEnteredRoom = sharedState?.inRoom;

  let [editRole, setEditRole] = useState(null);
  let [editSelf, setEditSelf] = useState(false);
  let [showReactions, setShowReactions] = useState(false);

  let [showShareInfo, setShowShareInfo] = useState(false);

  let {
    name,
    description,
    logoURI,
    buttonURI,
    buttonText,
    color,
    speakers,
    moderators,
  } = room || {};

  let isColorDark = useMemo(() => isDark(color), [color]);

  useLayoutEffect(() => {
    if (color && color !== '#4B5563') {
      document.body.style.backgroundColor = hexToRGB(color, '0.123');
    }
  }, [color]);

  if (!hasEnteredRoom)
    return (
      <EnterRoom
        roomId={roomId}
        name={name}
        description={description}
        logoURI={logoURI}
      />
    );

  let myPeerId = identity.publicKey;
  let stagePeers = (speakers || []).filter(id => id in peers);
  let audiencePeers = Object.keys(peers || {}).filter(
    id => !stagePeers.includes(id)
  );

  let myHandRaised = raisedHands.has(myPeerId);

  return (
    <div
      className="container"
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        className="child flex flex-col pt-2 md:p-10"
        style={{flex: '1', overflowY: 'auto', minHeight: '0'}}
      >
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

      {/* Navigation */}
      <div className="z-10 navigation bg-white p-4">
        {editRole && (
          <EditRole
            peerId={editRole}
            speakers={speakers}
            moderators={moderators}
            onCancel={() => setEditRole(null)}
          />
        )}
        {editSelf && <EditSelf onCancel={() => setEditSelf(false)} />}
        {/* microphone mute/unmute button */}
        {iSpeak && (
          <div className="flex">
            <button
              onClick={() => state.set('micMuted', !micMuted)}
              className="flex-grow select-none h-12 mt-4 px-6 text-lg text-white bg-gray-600 rounded-lg focus:outline-none active:bg-gray-600"
              style={{
                backgroundColor: color || '#4B5563',
                color: isColorDark ? 'white' : 'black',
              }}
            >
              {micOn
                ? micMuted
                  ? "🙊 You're silent"
                  : "🐵 You're on"
                : "🙊 You're off"}
            </button>

            <button
              className="flex-shrink mt-4 ml-3 select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
              onClick={() => leaveStage(roomId)}
            >
              ↓ Leave Stage
            </button>
            
          </div>
        )}
        {!iSpeak && (
          <div className="flex relative">
            <button
              className="select-none h-12 px-6 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600 flex-grow"
              style={{
                backgroundColor: color || '#4B5563',
                color: isColorDark ? 'white' : 'black',
              }}
              onClick={() => {
                raiseHand(!myHandRaised);
              }}
            >
              {myHandRaised ? (
                <>Stop&nbsp;raising&nbsp;hand</>
              ) : (
                <>✋🏽&nbsp;Raise&nbsp;hand&nbsp;to&nbsp;get&nbsp;on&nbsp;stage</>
              )}
            </button>
          </div>
        )}
        <br />
        <div className="flex relative">
          {/* <button
            onClick={() => state.set('soundMuted', !soundMuted)}
            className="select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 flex-grow"
          >
            {soundMuted ? '🔇' : '🔊'}&nbsp;{soundMuted ? 'Off' : 'On'}
          </button> */}
          <button
            onClick={() => setShowReactions(s => !s)}
            className="flex-grow select-none text-center h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
          >
            {/* heroicons/emoji-happy */}
            <svg
              className="text-gray-600 w-6 h-6 inline-block"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          {showReactions && (
            <div className="text-4xl w-64 flex-shrink text-black text-center bg-gray-200 rounded-lg absolute left-0 bottom-14">
              {reactionEmojis.map(r => (
                <button
                  className="m-2 p-2 human-radius select-none px-3 bg-gray-100 active:bg-gray-50"
                  key={r}
                  onClick={() => {
                    sendReaction(r);
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Share */}
          {showShareInfo && (
            <span
              style={{
                position: 'absolute',
                top: '-20px',
                right: '2px',
                fontSize: '13px',
              }}
            >
              Link copied to clipboard!
            </span>
          )}
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: name || 'A Jam room',
                  text: 'Hi, join me in this room on Jam.',
                  url: location.href,
                });
              } else {
                copyToClipboard(location.href);
                setShowShareInfo(true);
                setTimeout(() => setShowShareInfo(false), 2000);
              }
            }}
            className="ml-3 select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
          >
            {/* heroicons/share-small */}
            <svg
              className="text-gray-600 w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
          </button>

          {/* Leave */}
          <button
            className="flex-shrink ml-3 select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
            onClick={() => leaveRoom(roomId)}
          >
            🖖🏽&nbsp;Leave
          </button>
        </div>
      </div>
    </div>
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

function isDark(hex) {
  if (!hex) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r + g + b < 128 * 3;
}
