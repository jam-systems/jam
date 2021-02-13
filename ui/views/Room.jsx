import React, {useState} from 'react';
import {leaveRoom, state} from '../main';
import use from '../lib/use-state.js';
import swarm from '../lib/swarm.js';
import EnterRoom from './EnterRoom.jsx';
import {gravatarUrl} from '../lib/gravatar';
import copyToClipboard from '../lib/copy-to-clipboard';
import {put} from '../backend';
import {signedToken} from '../identity';
// import {getStorage} from '../lib/local-storage';

export default function Room({room, roomId}) {
  // room = {name, description, moderators: [peerId], speakers: [peerId]}
  let myInfo = use(state, 'myInfo');
  let myAudio = use(state, 'myAudio');
  let micOn = myAudio?.active;
  let micMuted = use(state, 'micMuted');
  let soundMuted = use(state, 'soundMuted');
  let speaking = use(state, 'speaking');
  let enteredRooms = use(state, 'enteredRooms');
  let peers = use(swarm, 'stickyPeers');
  let peerState = use(swarm, 'peerState');
  let identities = use(state, 'identities');

  let [editIdentity, setEditIdentity] = useState(false);
  let [editRole, setEditRole] = useState(null);

  let [showShareInfo, setShowShareInfo] = useState(false);

  let updateInfo = ({displayName, email}) => {
    state.set('myInfo', {displayName, email});
    setEditIdentity(false);
    swarm.hub.broadcast('identity-updates', swarm.myPeerId);
  };

  let {name, description, speakers, moderators} = room || {};
  let {myPeerId} = swarm;

  // TODO: visually distinguish moderators
  let modPeers = (moderators || []).filter(id => id in peers);
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

  let hasEnteredRoom = enteredRooms.has(roomId);

  if (!hasEnteredRoom)
    return <EnterRoom roomId={roomId} name={name} description={description} />;

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
        <div className="pl-2 text-gray-500">{description}</div>

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
                    <div className="human-radius p-1 bg-white">
                      <img
                        className="human-radius border border-gray-300 bg-yellow-50 w-20 h-20 md:w-28 md:h-28"
                        alt="me"
                        src={gravatarUrl(myInfo)}
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
                const peerInfo = identities[peerId] || {id: peerId};
                // TODO: hadStream is NOT the appropriate condition for showing avatar
                // need inRoom status from peers
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
                        <div className="human-radius p-1 bg-white">
                          <img
                            className="human-radius border border-gray-300 bg-yellow-50 w-20 h-20 md:w-28 md:h-28"
                            alt={peerInfo.displayName}
                            src={gravatarUrl(peerInfo)}
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

          <h3 className="text-gray-300">Audience</h3>
          <ol className="flex space-x-4 pt-6">
            {!iSpeak && (
              <li
                className="flex-shrink w-16 h-16 md:w-24 md:h-24 text-xs"
                style={{cursor: 'pointer'}}
                onClick={() => setEditIdentity(!editIdentity)}
              >
                <img
                  className="human-radius border border-gray-300 bg-yellow-50"
                  src={gravatarUrl(myInfo)}
                />
                <div className="text-center mt-2">{myInfo.displayName}</div>
              </li>
            )}
            {audiencePeers.map(peerId => {
              let {inRoom} = peerState[peerId] || {};
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
                    <img
                      className="human-radius border border-gray-300 bg-yellow-50"
                      alt={peerInfo.displayName}
                      src={gravatarUrl(peerInfo)}
                    />
                    <div className="text-center mt-2">
                      {peerInfo.displayName}
                    </div>
                  </li>
                )
              );
            })}
            {/* <li className="flex-shrink w-24 h-24 ring-yellow-500">
              <img
                className="human-radius border border-gray-300"
                src="img/avatars/sonic.jpg"
              />
            </li> */}

            {/* <li className="flex-shrink w-24 h-24">
              <img
                className="human-radius border border-gray-300"
                src="img/avatars/christoph.jpg"
              />
            </li>
            <li className="flex-shrink w-24 h-24">
              <img
                className="human-radius border border-gray-300"
                src="img/avatars/tosh.jpg"
              />
            </li> */}
          </ol>
        </div>

        <br />
        <br />
        {/*
            TODO: implement concept of stage / audience + raising hands
            hide this for now
        */}
        <div className="hidden">
          <h3 className="pb-6">Raised their hand</h3>

          <div className="p-2 max-w-sm mx-auto flex items-center space-x-4">
            <div className="flex-shrink-0">
              <img
                className="h-12 w-12 human-radius"
                src="/img/avatars/christoph.jpg"
                alt="Sonic"
              />
            </div>
            <div>
              <div className="text-xl font-book text-black">
                Christoph Witzany
              </div>
              <p className="text-gray-500">
                Product, UX, StarCraft, Clojure, …
              </p>
            </div>
          </div>
          <div className="p-2 max-w-sm mx-auto flex items-center space-x-4">
            <div className="flex-shrink-0">
              <img
                className="h-12 w-12 human-radius"
                src="/img/avatars/sonic.jpg"
                alt="Sonic"
              />
            </div>
            <div>
              <div className="text-xl font-book text-black">Thomas Schranz</div>
              <p className="text-gray-500">
                Product, UX, StarCraft, Clojure, …
              </p>
            </div>
          </div>
          <div className="p-2 max-w-sm mx-auto flex items-center space-x-4">
            <div className="flex-shrink-0">
              <img
                className="h-12 w-12 human-radius"
                src="/img/avatars/gregor.jpg"
                alt="Sonic"
              />
            </div>
            <div>
              <div className="text-xl font-book text-black">
                Gregor Mitscha-Baude
              </div>
              <p className="text-gray-500">
                Product, UX, StarCraft, Clojure, …
              </p>
            </div>
          </div>
        </div>
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

        <div className="flex">
          <button
            onClick={() => state.set('soundMuted', !soundMuted)}
            className="select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 flex-grow"
          >
            {soundMuted ? '🔇' : '🔊'}&nbsp;{soundMuted ? 'Off' : 'On'}
          </button>

          {/* Share */}
          {showShareInfo && (
            <span
              style={{
                position: 'absolute',
                top: '-20px',
                left: '2px',
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
