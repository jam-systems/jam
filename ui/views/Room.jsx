import React, {useEffect, useState} from 'react';
import {leaveRoom, sendReaction, state} from '../main';
import {useMany} from '../lib/use-state.js';
import swarm from '../lib/swarm.js';
import EnterRoom from './EnterRoom.jsx';
import {gravatarUrl} from '../lib/gravatar';
import copyToClipboard from '../lib/copy-to-clipboard';
import {put} from '../backend';
import {signedToken} from '../identity';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import animateEmoji from '../lib/animate-emoji';

const reactionEmojis = ['❤️', '💯', '😂', '😅', '😳', '🤔'];

export default function Room({room, roomId}) {
  // room = {name, description, moderators: [peerId], speakers: [peerId]}
  let [
    myInfo,
    myAudio,
    micMuted,
    reactions,
    identities,
    speaking,
  ] = useMany(state, [
    'myInfo',
    'myAudio',
    'micMuted',
    'reactions',
    'identities',
    'speaking',
  ]);
  let [peers, peerState, sharedState] = useMany(swarm, [
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

  let updateInfo = ({displayName, email}) => {
    state.set('myInfo', {displayName, email});
    setEditIdentity(false);
    swarm.hub.broadcast('identity-updates', swarm.myPeerId);
  };

  let {name, description, logoURI, color, speakers, moderators} = room || {};

  if (color) {
    let hexToRGB = (hex, alpha) => {

      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      if (alpha) {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else {
        return `rgb(${r}, ${g}, ${b})`;
      }
    };

    document.body.style.backgroundColor = hexToRGB(color, "0.123");
  };


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
    return <EnterRoom roomId={roomId} name={name} description={description} logoURI={logoURI} />;

  let customUriTransformer = uri => {
    return uri.startsWith('bitcoin:') ? uri : ReactMarkdown.uriTransformer(uri);
  };

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
        className="child flex flex-col md:p-10"
        style={{flex: '1', overflowY: 'auto', minHeight: '0'}}
      >
        <div className="flex">
          <div className="flex-shrink">
            { logoURI && (
              <img className="w-16 h-16 border rounded p-1 m-2 mt-0" src={logoURI} />)
            }
          </div>
          <div className="flex-grow">
            <h1 className="pl-2 pt-6 md:pt-0">{name}</h1>
            <div className="pl-2 text-gray-500">
              <ReactMarkdown
                className="markdown"
                plugins={[gfm]}
                linkTarget="_blank"
                transformLinkUri={customUriTransformer}
              >
                {description || 'This is a Room on Jam'}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Main Area */}
        <div className="">
          {/* Stage */}
          <div className="">
            <ol className="flex flex-wrap space-x-2 pt-6">
              {iSpeak && (
                <li
                  className="relative items-center space-y-1 mt-4"
                  style={{cursor: 'pointer'}}
                  onClick={() => setEditIdentity(!editIdentity)}
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
                        className="human-radius border border-gray-300 bg-yellow-50 w-20 h-20 md:w-28 md:h-28"
                        alt="me"
                        src={gravatarUrl(myInfo)}
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
                  <div className="font-medium w-20 md:w-28 m-2">
                    <div className="flex">
                      <div
                        style={{lineHeight: '30px', marginTop: '4px'}}
                        className={
                          moderators.includes(swarm.myPeerId)
                            ? 'flex-none block bg-yellow-400 text-white font-light text-4xl w-4 h-4 text-center rounded-full'
                            : 'hidden'
                        }
                      >
                        *
                      </div>
                      <div className="flex-none pl-1 overflow-ellipsis w-20 md:w-28">
                        {myInfo.displayName}
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
                      className="relative items-center space-y-1 mt-4"
                      title={peerInfo.displayName}
                      style={iModerate ? {cursor: 'pointer'} : undefined}
                      onClick={
                        iModerate ? () => setEditRole(peerId) : undefined
                      }
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
                            className="human-radius border border-gray-300 bg-yellow-50 w-20 h-20 md:w-28 md:h-28"
                            alt={peerInfo.displayName}
                            src={gravatarUrl(peerInfo)}
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
                          <div
                            style={{lineHeight: '30px', marginTop: '4px'}}
                            className={
                              moderators.includes(peerId)
                                ? 'flex-none block bg-yellow-400 text-white font-light text-4xl w-4 h-4 text-center rounded-full'
                                : 'hidden'
                            }
                          >
                            *
                          </div>
                          <div className="flex-none pl-1 overflow-ellipsis w-20 md:w-28">
                            {peerInfo.displayName}
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
          <ol className="flex space-x-4 pt-6">
            {!iSpeak && (
              <li
                className="flex-shrink w-16 h-16 md:w-24 md:h-24 text-xs"
                style={{cursor: 'pointer'}}
                onClick={() => setEditIdentity(!editIdentity)}
              >
                <div className="relative flex justify-center">
                  <img
                    className="human-radius w-16 h-16 md:w-24 md:h-24 border border-gray-300 bg-yellow-50"
                    src={gravatarUrl(myInfo)}
                  />
                  <Reactions
                    reactions={myReactions}
                    className="absolute bg-white text-4xl md:text-6xl pt-3 md:pt-4 human-radius w-16 h-16 md:w-24 md:h-24 border text-center"
                  />
                </div>
                <div className="text-center mt-2">{myInfo.displayName}</div>
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
                    className="flex-shrink w-16 h-16 md:w-24 md:h-24 text-xs"
                    style={iModerate ? {cursor: 'pointer'} : undefined}
                    onClick={iModerate ? () => setEditRole(peerId) : undefined}
                  >
                    <div className="relative flex justify-center">
                      <img
                        className="human-radius w-16 h-16 md:w-24 md:h-24 border border-gray-300 bg-yellow-50"
                        alt={peerInfo.displayName}
                        src={gravatarUrl(peerInfo)}
                      />
                      <Reactions
                        reactions={reactions_}
                        className="absolute bg-white text-4xl md:text-6xl pt-3 md:pt-4 human-radius w-16 h-16 md:w-24 md:h-24 border text-center"
                      />
                    </div>
                    <div className="text-center mt-2">
                      {peerInfo.displayName}
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
        <div className="flex">
          <button
            onClick={() => state.set('micMuted', !micMuted)}
            className="select-none h-12 mt-4 px-6 text-lg text-black bg-yellow-200 rounded-lg focus:shadow-outline active:bg-yellow-300 w-screen"
            style={{backgroundColor: (color || "#FDE68A")}}
          >
            {micOn
              ? micMuted
                ? "🙊 You're silent"
                : "🐵 You're on"
              : "🙊 You're off"}
          </button>
        </div>

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
                  className="m-2 p-2 human-radius select-none px-3 bg-gray-100 active:bg-gray-300"
                  key={r}
                  onClick={() => {
                    setShowReactions(false);
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
            🚪&nbsp;Leave
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
      {reactions.map(([r, id]) => (
        <AnimatedEmoji
          key={id}
          emoji={r}
          className={className}
          style={{
            alignSelf: 'center',
          }}
        />
      ))}
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
  let submit = e => {
    e.preventDefault();
    onSubmit({displayName, email});
  };
  let cancel = e => {
    e.preventDefault();
    onCancel();
  };
  return (
    <div className="child md:p-10">
      <h3 className="font-medium">Edit Profile</h3>
      <br />
      <form onSubmit={submit}>
        <input
          className="rounded placeholder-gray-300 bg-gray-50 w-48"
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
          className="rounded placeholder-gray-300 bg-gray-50 w-72"
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
        <button
          onClick={submit}
          className="mt-5 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2"
        >
          Update Profile
        </button>
        <button
          onClick={cancel}
          className="mt-5 h-12 px-6 text-lg text-black bg-gray-100 rounded-lg focus:shadow-outline active:bg-gray-300"
        >
          Cancel
        </button>
      </form>
      <br />
      <hr />
    </div>
  );
}
