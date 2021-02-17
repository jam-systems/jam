import React, {useState} from 'react';
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

const reactionButton = '❤️';
const reactionEmojis = ['💯', '😂', '👋', '✌️', '👋'];

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

  let {name, description, speakers, moderators} = room || {};
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
    return <EnterRoom roomId={roomId} name={name} description={description} />;

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

                      <Reactions reactions={myReactions} size="64px" />
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
                          <Reactions reactions={reactions_} size="64px" />
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
                  <Reactions reactions={myReactions} size="56px" />
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
                      <Reactions reactions={reactions_} size="56px" />
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
      <div className="z-10 navigation bg-white p-4 pb-8">
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
            className="select-none h-12 mt-4 px-6 text-lg text-black bg-yellow-200 rounded-lg focus:shadow-outline active:bg-yellow-300 flex-grow"
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
            className="select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 flex-grow"
          >
            {reactionButton} React
          </button>
          {showReactions && (
            <div className="h-12 text-4xl text-black bg-gray-200 rounded-lg absolute left-0 -top-14">
              {reactionEmojis.map(r => (
                <button
                  className="select-none h-12 px-3 active:bg-gray-300"
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
            ✉️&nbsp;Share
          </button>

          {/* Leave */}
          <button
            className="ml-3 select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
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

function Reactions({size, reactions}) {
  if (!reactions) return null;
  return (
    <>
      {reactions.map(([r, id]) => (
        <div
          key={id}
          className="absolute"
          style={{
            alignSelf: 'center',
            fontSize: size,
          }}
        >
          {r}
        </div>
      ))}
    </>
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
