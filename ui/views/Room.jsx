import React, {useState} from 'react';
import {use} from 'use-minimal-state';
import EnterRoom from './EnterRoom';
import RoomHeader from './RoomHeader';
import {openModal} from './Modal';
import {EditRoomModal} from './EditRoom';
import useWakeLock from '../lib/use-wake-lock';
import {AudienceAvatar, StageAvatar} from './Avatar';
import {useMqParser} from '../lib/tailwind-mqp';
import Container from './Container';
import Navigation from './Navigation';
import {userAgent} from '../lib/user-agent';
import {usePushToTalk, useJamState} from '../jam-core-react';

const inWebView =
  userAgent.browser?.name !== 'JamWebView' &&
  (userAgent.browser?.name === 'Chrome WebView' ||
    (userAgent.os?.name === 'iOS' &&
      userAgent.browser?.name !== 'Mobile Safari'));

export default function Room({room, roomId, uxConfig}) {
  // room = {name, description, moderators: [peerId], speakers: [peerId]}
  const state = useJamState();
  useWakeLock();
  usePushToTalk();

  let [
    reactions,
    handRaised,
    identities,
    speaking,
    iSpeak,
    iModerate,
    myIdentity,
    inRoom,
  ] = use(state, [
    'reactions',
    'handRaised',
    'identities',
    'speaking',
    'iAmSpeaker',
    'iAmModerator',
    'myIdentity',
    'inRoom',
  ]);
  let [peers, peerState, myPeerState] = use(state.swarm, [
    'stickyPeers',
    'peerState',
    'myPeerState',
  ]);

  let myInfo = myIdentity.info;
  let hasEnteredRoom = inRoom === roomId;

  let [editRole, setEditRole] = useState(null);
  let [editSelf, setEditSelf] = useState(false);

  let {
    name,
    description,
    schedule,
    logoURI,
    buttonURI,
    buttonText,
    speakers,
    moderators,
    closed,
    stageOnly,
    shareUrl,
  } = room || {};

  let mqp = useMqParser();

  if (!iModerate && closed) {
    return (
      <EnterRoom
        roomId={roomId}
        name={name}
        description={description}
        schedule={schedule}
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
        schedule={schedule}
        logoURI={logoURI}
      />
    );
  }

  let myPeerId = myInfo.id;
  let allPeers = Object.keys(peers ?? {});
  let stagePeers = stageOnly
    ? allPeers
    : (speakers ?? []).filter(id => id in peers);
  let audiencePeers = stageOnly
    ? []
    : allPeers.filter(id => !stagePeers.includes(id));

  let {noLeave} = uxConfig;

  return (
    <Container style={{display: 'flex', flexDirection: 'column'}}>
      <div
        className={mqp('flex flex-col pt-2 md:pt-10 md:p-10')}
        style={{flex: '1', overflowY: 'auto', minHeight: '0'}}
      >
        <div
          className={
            inWebView
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
          Open in {userAgent.os?.name === 'iOS' ? 'Safari' : 'Chrome'} for best
          experience.
          <br />
          <a
            className="underline"
            href="https://gitlab.com/jam-systems/jam"
            target="_blank"
            rel="nofollow noreferrer"
          >
            Learn more
          </a>
          .
        </div>
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
                  {...{speaking, moderators, reactions, room}}
                  peerState={myPeerState}
                  info={myInfo}
                  onClick={() => setEditSelf(true)}
                />
              )}
              {stagePeers.map(peerId => (
                <StageAvatar
                  key={peerId}
                  {...{speaking, moderators, room}}
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
          {!stageOnly && (
            <>
              <h3 className="text-gray-400 pl-4 pb-4">Audience</h3>
              <ol className="flex flex-wrap">
                {!iSpeak && (
                  <AudienceAvatar
                    {...{reactions, room}}
                    peerId={myPeerId}
                    peerState={myPeerState}
                    info={myInfo}
                    handRaised={handRaised}
                    onClick={() => setEditSelf(true)}
                  />
                )}
                {audiencePeers.map(peerId => (
                  <AudienceAvatar
                    key={peerId}
                    {...{peerId, peerState, reactions, room}}
                    peerState={peerState[peerId]}
                    info={identities[peerId]}
                    handRaised={iModerate && peerState[peerId]?.handRaised}
                    onClick={iModerate ? () => setEditRole(peerId) : undefined}
                  />
                ))}
              </ol>
            </>
          )}
        </div>

        <div style={{height: '136px', flex: 'none'}} />
      </div>

      <Navigation
        {...{
          roomId,
          room,
          editRole,
          setEditRole,
          editSelf,
          setEditSelf,
          noLeave,
        }}
      />
    </Container>
  );
}
