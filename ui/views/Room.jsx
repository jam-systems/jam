import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {leaveRoom, sendReaction, state} from '../main';
import {use} from 'use-minimal-state';
import swarm from '../lib/swarm.js';
import EnterRoom from './EnterRoom.jsx';
import RoomHeader from './RoomHeader.jsx';
import {avatarUrl} from '../lib/avatar';
import copyToClipboard from '../lib/copy-to-clipboard';
import {put} from '../backend';
import {signedToken} from '../identity';
import animateEmoji from '../lib/animate-emoji';
import {openModal} from './Modal';
import {EditRoomModal} from './EditRoom';
import SparkMD5 from 'spark-md5';
import useWakeLock from '../lib/use-wake-lock';

const reactionEmojis = ['❤️', '💯', '😂', '😅', '😳', '🤔'];

export default function Room({room, roomId}) {
  // room = {name, description, moderators: [peerId], speakers: [peerId]}
  useWakeLock();
  let [myInfo, myAudio, micMuted, reactions, identities, speaking] = use(
    state,
    ['myInfo', 'myAudio', 'micMuted', 'reactions', 'identities', 'speaking']
  );
  let [peers, peerState, sharedState] = use(swarm, [
    'stickyPeers',
    'peerState',
    'sharedState',
  ]);

  let micOn = myAudio?.active;
  let hasEnteredRoom = sharedState?.inRoom;

  let [editIdentity, setEditIdentity] = useState(false);
  let [editRole, setEditRole] = useState(null);
  let [showReactions, setShowReactions] = useState(false);

  let [showShareInfo, setShowShareInfo] = useState(false);

  let updateInfo = ({displayName, twitter, emailHash, avatar}) => {
    twitter = twitter.trim();
    if (twitter && !twitter.includes('@')) {
      twitter = '@' + twitter;
    }
    state.set('myInfo', {displayName, twitter, emailHash, avatar});
    setEditIdentity(false);
    swarm.hub.broadcast('identity-updates', {});
  };

  let {name, description, logoURI, color, speakers, moderators} = room || {};

  let isColorDark = useMemo(() => isDark(color), [color]);

  useLayoutEffect(() => {
    if (color && color !== '#FDE68A') {
      document.body.style.backgroundColor = hexToRGB(color, '0.123');
    }
  }, [color]);

  let {myPeerId} = swarm;

  let stagePeers = (speakers || []).filter(id => id in peers);
  let audiencePeers = Object.keys(peers || {}).filter(
    id => !stagePeers.includes(id)
  );

  let iSpeak = (speakers || []).includes(myPeerId);
  let iModerate = (moderators || []).includes(myPeerId);

  let addRole = async (id, role) => {
    if (!room) return;
    if (!moderators.includes(swarm.myPeerId)) return;
    if (role !== 'speakers' && role !== 'moderators') return;
    let existing = role === 'speakers' ? speakers : moderators;
    if (existing.includes(id)) return;
    console.log('adding to', role, id);
    let newRoom = {...room, [role]: [...existing, id]};
    await put(signedToken(), `/rooms/${roomId}`, newRoom);
    setEditRole(null);
  };

  let removeRole = async (id, role) => {
    if (!room) return;
    if (!moderators.includes(swarm.myPeerId)) return;
    if (role !== 'speakers' && role !== 'moderators') return;
    let existing = role === 'speakers' ? speakers : moderators;
    if (!existing.includes(id)) return;
    console.log('removing from', role, id);
    let newRoom = {...room, [role]: existing.filter(id_ => id_ !== id)};
    await put(signedToken(), `/rooms/${roomId}`, newRoom);
    setEditRole(null);
  };

  if (!hasEnteredRoom)
    return (
      <EnterRoom
        roomId={roomId}
        name={name}
        description={description}
        logoURI={logoURI}
      />
    );

  let myReactions = reactions[myPeerId];

  return (
    <div
      className="container"
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        className="child flex flex-col pt-8 md:p-10"
        style={{flex: '1', overflowY: 'auto', minHeight: '0'}}
      >
        <RoomHeader
          {...{name, description, logoURI}}
          editRoom={
            iModerate && (() => openModal(EditRoomModal, {roomId, room}))
          }
        />

        {/* Main Area */}
        <div className="">
          {/* Stage */}
          <div className="">
            <ol className="flex flex-wrap pt-6">
              {iSpeak && (
                <li
                  className="relative items-center space-y-1 mt-4 ml-2 mr-2"
                  style={{cursor: 'pointer'}}
                >
                  <div
                    className={
                      speaking.has('me')
                        ? 'human-radius p-1 bg-gray-300'
                        : 'human-radius p-1 bg-white'
                    }
                  >
                    <div className="human-radius p-1 bg-white relative flex justify-center">
                      <img
                        className="human-radius border border-gray-300 bg-yellow-50 w-20 h-20 md:w-28 md:h-28 object-cover"
                        alt="me"
                        src={avatarUrl(myInfo)}
                        onClick={() => setEditIdentity(!editIdentity)}
                      />

                      <Reactions
                        reactions={myReactions}
                        className="absolute bg-white text-5xl md:text-7xl pt-4 md:pt-5 human-radius w-20 h-20 md:w-28 md:h-28 border text-center"
                      />
                    </div>
                  </div>
                  <div className={micMuted ? '' : 'hidden'}>
                    <div className="absolute w-10 h-10 right-0 top-12 md:top-20 rounded-full bg-white border-2 text-2xl border-gray-400 flex items-center justify-center">
                      🙊
                    </div>
                  </div>
                  <div className="w-20 md:w-28 m-2">
                    <div className="flex">
                      <div className="flex-none text-center pl-1 w-20 md:w-28">
                        <span className="text-sm md:text-base whitespace-nowrap w-22 md:w-30 text-black font-medium">
                          <span
                            style={{margin: '0 3px 0 -4px'}}
                            className={
                              iModerate
                                ? 'flex-none inline-block leading-3 bg-gray-600 text-white w-3 h-3 rounded-full -ml-3'
                                : 'hidden'
                            }
                          >
                            <svg
                              className="inline-block w-2 h-2"
                              style={{margin: '-3px 0 0 0'}}
                              x="0px"
                              y="0px"
                              viewBox="0 0 1000 1000"
                              enableBackground="new 0 0 1000 1000"
                              fill="currentColor"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M894.5,633.4L663.3,500l231.1-133.4c39.1-22.6,52.4-72.5,29.9-111.6c-22.6-39.1-72.5-52.4-111.6-29.9L581.7,358.5V91.7c0-45.1-36.6-81.7-81.7-81.7c-45.1,0-81.7,36.6-81.7,81.7v266.9L187.2,225.1c-39.1-22.6-89-9.2-111.6,29.9c-22.6,39.1-9.2,89,29.9,111.6L336.7,500L105.5,633.4C66.5,656,53.1,705.9,75.6,745c22.6,39.1,72.5,52.4,111.6,29.9l231.1-133.4v266.9c0,45.1,36.6,81.7,81.7,81.7c45.1,0,81.7-36.6,81.7-81.7V641.5l231.1,133.4c39.1,22.6,89,9.2,111.6-29.9C946.9,705.9,933.5,656,894.5,633.4z" />
                            </svg>
                          </span>
                          {myInfo.displayName.substring(0, 12)}
                        </span>
                        {/* twitter */}
                        <div
                          className={myInfo.twitter ? 'text-center' : 'hidden'}
                        >
                          <span className="text-sm">
                            <span className="text-gray-800">@</span>
                            <a
                              className="text-gray-500 font-medium ml-1"
                              style={{
                                textDecoration: 'none',
                                fontWeight: 'normal',
                              }}
                              href={'https://twitter.com/' + myInfo.twitter}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {myInfo.twitter?.substring(1)}
                            </a>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )}
              {stagePeers.map(peerId => {
                let {micMuted, inRoom} = peerState[peerId] || {};
                let reactions_ = reactions[peerId];
                const peerInfo = identities[peerId] || {id: peerId};
                return (
                  inRoom && (
                    <li
                      key={peerId}
                      className="relative items-center space-y-1 mt-4 ml-2 mr-2"
                      title={peerInfo.displayName}
                      style={iModerate ? {cursor: 'pointer'} : undefined}
                    >
                      <div
                        className={
                          speaking.has(peerId)
                            ? 'human-radius p-1 bg-gray-300'
                            : 'human-radius p-1 bg-white'
                        }
                      >
                        <div className="human-radius p-1 bg-white relative flex justify-center">
                          <img
                            className="human-radius border border-gray-300 bg-yellow-50 w-20 h-20 md:w-28 md:h-28 object-cover"
                            alt={peerInfo.displayName}
                            src={avatarUrl(peerInfo)}
                            onClick={
                              iModerate ? () => setEditRole(peerId) : undefined
                            }
                          />
                          <Reactions
                            reactions={reactions_}
                            className="absolute bg-white text-5xl md:text-7xl pt-4 md:pt-5 human-radius w-20 h-20 md:w-28 md:h-28 border text-center"
                          />
                        </div>
                      </div>
                      {/* div for showing mute/unmute status */}
                      <div className={micMuted ? '' : 'hidden'}>
                        <div className="absolute w-10 h-10 right-0 top-12 md:top-20 rounded-full bg-white border-2 text-2xl border-gray-400 flex items-center justify-center">
                          🙊
                        </div>
                      </div>
                      <div className="font-medium w-20 md:w-28 m-2">
                        <div className="flex">
                          <div className="flex-none text-center pl-1 w-20 md:w-28">
                            <span className="text-sm md:text-base whitespace-nowrap w-22 md:w-30 text-black font-medium">
                              <span
                                style={{margin: '0 3px 0 -4px'}}
                                className={
                                  moderators.includes(peerId)
                                    ? 'flex-none inline-block leading-3 bg-gray-600 text-white w-3 h-3 rounded-full -ml-3'
                                    : 'hidden'
                                }
                              >
                                <svg
                                  className="inline-block w-2 h-2"
                                  style={{margin: '-3px 0 0 0'}}
                                  x="0px"
                                  y="0px"
                                  viewBox="0 0 1000 1000"
                                  enableBackground="new 0 0 1000 1000"
                                  fill="currentColor"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path d="M894.5,633.4L663.3,500l231.1-133.4c39.1-22.6,52.4-72.5,29.9-111.6c-22.6-39.1-72.5-52.4-111.6-29.9L581.7,358.5V91.7c0-45.1-36.6-81.7-81.7-81.7c-45.1,0-81.7,36.6-81.7,81.7v266.9L187.2,225.1c-39.1-22.6-89-9.2-111.6,29.9c-22.6,39.1-9.2,89,29.9,111.6L336.7,500L105.5,633.4C66.5,656,53.1,705.9,75.6,745c22.6,39.1,72.5,52.4,111.6,29.9l231.1-133.4v266.9c0,45.1,36.6,81.7,81.7,81.7c45.1,0,81.7-36.6,81.7-81.7V641.5l231.1,133.4c39.1,22.6,89,9.2,111.6-29.9C946.9,705.9,933.5,656,894.5,633.4z" />
                                </svg>
                              </span>
                              {peerInfo.displayName.substring(0, 12)}
                            </span>
                            {/* twitter */}
                            <div
                              className={
                                peerInfo.twitter ? 'text-center' : 'hidden'
                              }
                            >
                              <span className="text-sm">
                                <span className="text-gray-800">@</span>
                                <a
                                  className="text-gray-500 font-medium ml-1"
                                  style={{
                                    textDecoration: 'none',
                                    fontWeight: 'normal',
                                  }}
                                  href={
                                    'https://twitter.com/' + peerInfo.twitter
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {peerInfo.twitter?.substring(1)}
                                </a>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                );
              })}
            </ol>
          </div>

          <br />

          <h3 className="text-gray-400">Audience</h3>
          <ol className="flex flex-wrap pt-6">
            {!iSpeak && (
              <li
                className="flex-none m-2 w-16 h-32 md:w-24 md:h-36 text-xs"
                style={{cursor: 'pointer'}}
              >
                <div className="relative flex justify-center">
                  <img
                    alt={myInfo.displayName}
                    className="human-radius w-16 h-16 md:w-24 md:h-24 border border-gray-300 bg-yellow-50 object-cover"
                    src={avatarUrl(myInfo)}
                    onClick={() => setEditIdentity(!editIdentity)}
                  />
                  <Reactions
                    reactions={myReactions}
                    className="absolute bg-white text-4xl md:text-6xl pt-3 md:pt-4 human-radius w-16 h-16 md:w-24 md:h-24 border text-center"
                  />
                </div>
                <div className="overflow-hidden whitespace-nowrap text-center mt-2">
                  {myInfo.displayName}
                </div>
                {/* twitter */}
                <div className={myInfo.twitter ? 'text-center mt-1' : 'hidden'}>
                  <span className="text-xs">
                    <span className="text-gray-800">@</span>
                    <a
                      className="text-gray-500 font-medium ml-1"
                      style={{textDecoration: 'none', fontWeight: 'normal'}}
                      href={'https://twitter.com/' + myInfo.twitter}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {myInfo.twitter?.substring(1)}
                    </a>
                  </span>
                </div>
              </li>
            )}
            {audiencePeers.map(peerId => {
              let {inRoom} = peerState[peerId] || {};
              let reactions_ = reactions[peerId];
              const peerInfo = identities[peerId] || {id: peerId};
              return (
                inRoom && (
                  <li
                    key={peerId}
                    title={peerInfo.displayName}
                    className="flex-none m-2 w-16 h-32 md:w-24 md:h-36 text-xs"
                    style={iModerate ? {cursor: 'pointer'} : undefined}
                  >
                    <div className="relative flex justify-center">
                      <img
                        className="human-radius w-16 h-16 md:w-24 md:h-24 border border-gray-300 bg-yellow-50 object-cover"
                        alt={peerInfo.displayName}
                        src={avatarUrl(peerInfo)}
                        onClick={
                          iModerate ? () => setEditRole(peerId) : undefined
                        }
                      />
                      <Reactions
                        reactions={reactions_}
                        className="absolute bg-white text-4xl md:text-6xl pt-3 md:pt-4 human-radius w-16 h-16 md:w-24 md:h-24 border text-center"
                      />
                    </div>
                    <div className="overflow-hidden whitespace-nowrap text-center mt-2">
                      {peerInfo.displayName}
                    </div>
                    {/* twitter */}
                    <div
                      className={
                        peerInfo.twitter ? 'text-center mt-1' : 'hidden'
                      }
                    >
                      <span className="text-xs">
                        <span className="text-gray-800">@</span>
                        <a
                          className="text-gray-500 font-medium ml-1"
                          style={{textDecoration: 'none', fontWeight: 'normal'}}
                          href={'https://twitter.com/' + peerInfo.twitter}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {peerInfo.twitter?.substring(1)}
                        </a>
                      </span>
                    </div>
                  </li>
                )
              );
            })}
          </ol>
        </div>

        <br />
        <br />
      </div>

      {/* Navigation */}
      <div className="z-10 navigation bg-white p-4">
        {editIdentity && (
          <EditIdentity
            info={myInfo}
            onSubmit={updateInfo}
            onCancel={() => setEditIdentity(false)}
          />
        )}
        {editRole && (
          <EditRole
            peerId={editRole}
            addRole={addRole}
            removeRole={removeRole}
            speakers={speakers}
            moderators={moderators}
            onCancel={() => setEditRole(null)}
          />
        )}
        {/* microphone mute/unmute button */}
        {iSpeak && (
          <div className="flex">
            <button
              onClick={() => state.set('micMuted', !micMuted)}
              className="select-none h-12 mt-4 px-6 text-lg text-black bg-yellow-200 rounded-lg focus:shadow-outline active:bg-yellow-300 w-screen"
              style={{
                backgroundColor: color || '#FDE68A',
                color: isColorDark ? 'white' : 'black',
              }}
            >
              {micOn
                ? micMuted
                  ? "🙊 You're silent"
                  : "🐵 You're on"
                : "🙊 You're off"}
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
            className="select-none text-center h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
          >
            {/* heroicons/emoji-happy */}
            <svg
              className="text-gray-600 w-6 h-6"
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
            className="ml-3 select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 flex-grow"
            onClick={() => leaveRoom(roomId)}
          >
            🖖🏽&nbsp;Leave
          </button>
        </div>

        <div className="flex relative">
          <button className="select-none hidden h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 flex-grow">
            ✋🏽&nbsp;Raise&nbsp;hand
          </button>
        </div>
      </div>
    </div>
  );
}

function Reactions({reactions, className}) {
  if (!reactions) return null;
  return (
    <>
      {reactions.map(
        ([r, id]) =>
          reactionEmojis.includes(r) && (
            <AnimatedEmoji
              key={id}
              emoji={r}
              className={className}
              style={{
                alignSelf: 'center',
              }}
            />
          )
      )}
    </>
  );
}

function AnimatedEmoji({emoji, ...props}) {
  let [element, setElement] = useState(null);
  useEffect(() => {
    if (element) animateEmoji(element);
  }, [element]);
  return (
    <div ref={setElement} {...props}>
      {emoji}
    </div>
  );
}

function EditRole({
  peerId,
  addRole,
  removeRole,
  speakers,
  moderators,
  onCancel,
}) {
  return (
    <div className="child md:p-10">
      <h3 className="font-medium">Moderator Actions</h3>
      <br />
      <button
        onClick={() => addRole(peerId, 'speakers')}
        className={
          speakers.includes(peerId)
            ? 'hidden'
            : 'mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2'
        }
      >
        ↑ Invite to Stage
      </button>
      <button
        onClick={() => removeRole(peerId, 'speakers')}
        className={
          speakers.includes(peerId)
            ? 'mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2'
            : 'hidden'
        }
      >
        ↓ Move to Audience
      </button>
      <button
        onClick={() => addRole(peerId, 'moderators')}
        className={
          !speakers.includes(peerId) || moderators.includes(peerId)
            ? 'hidden'
            : 'mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2'
        }
      >
        ✳️ Make Moderator
      </button>
      <button
        onClick={() => removeRole(peerId, 'moderators')}
        className={
          moderators.includes(peerId)
            ? 'mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2'
            : 'hidden'
        }
      >
        ❎ Demote Moderator
      </button>
      <button
        onClick={onCancel}
        className="mb-2 h-12 px-6 text-lg text-black bg-gray-100 rounded-lg focus:shadow-outline active:bg-gray-300"
      >
        Cancel
      </button>
      <br />
      <br />
      <hr />
    </div>
  );
}

function EditIdentity({info, onSubmit, onCancel}) {
  let [displayName, setDisplayName] = useState(info?.displayName);
  let [email, setEmail] = useState(info?.email);
  let [twitter, setTwitter] = useState(info?.twitter);
  let emailHash = email ? SparkMD5.hash(email) : info?.emailHash;
  let submit = e => {
    let selectedFile = document.querySelector('.edit-profile-file-input')
      .files[0];
    if (selectedFile) {
      console.log('file selected');
      let reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = () => {
        e.preventDefault();
        let avatar = reader.result;
        console.log(avatar);
        onSubmit({displayName, twitter, emailHash, avatar});
      };
    }
    e.preventDefault();
    onSubmit({displayName, twitter, emailHash});
  };
  let cancel = e => {
    e.preventDefault();
    onCancel();
  };
  return (
    <div className="child md:p-10">
      <hr />
      <br />
      <h3 className="font-medium">Edit Profile</h3>
      <br />
      <form onSubmit={submit}>
        <input
          className="rounded placeholder-gray-400 bg-gray-50 w-48"
          type="text"
          placeholder="Display name"
          value={displayName || ''}
          name="display-name"
          onChange={e => {
            setDisplayName(e.target.value);
          }}
        />
        <div className="p-2 text-gray-500 italic">
          {`What's your name?`}
          <span className="text-gray-300"> (optional)</span>
        </div>
        <br />
        <input
          type="file"
          accept="image/*"
          className="edit-profile-file-input rounded placeholder-gray-400 bg-gray-50 w-72"
        />
        <div className="p-2 text-gray-500 italic">
          Select your profile picture
          <span className="text-gray-300"> (optional)</span>
        </div>
        <br />
        <input
          className="rounded placeholder-gray-400 bg-gray-50 w-48"
          type="text"
          placeholder="@twitter"
          value={twitter || ''}
          name="twitter"
          onChange={e => {
            setTwitter(e.target.value);
          }}
        />
        <div className="p-2 text-gray-500 italic">
          {`What's your twitter?`}
          <span className="text-gray-300"> (optional)</span>
        </div>
        <br />
        <input
          className="rounded placeholder-gray-400 bg-gray-50 w-72"
          type="email"
          placeholder="email@example.com"
          value={email || ''}
          name="email"
          onChange={e => {
            setEmail(e.target.value);
          }}
        />
        <div className="p-2 text-gray-500 italic">
          {`What's your email?`}
          <span className="text-gray-300"> (used for Gravatar)</span>
        </div>
        <div className="flex">
          <button
            onClick={submit}
            className="flex-grow mt-5 h-12 px-6 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600 mr-2"
          >
            Done
          </button>
          <button
            onClick={cancel}
            className="flex-none mt-5 h-12 px-6 text-lg text-black bg-gray-100 rounded-lg focus:shadow-outline active:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
      <br />
      <hr />
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
  if (!hex) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r + g + b < 128 * 3;
}
