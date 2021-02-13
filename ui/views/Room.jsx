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
    <div className="container">
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
          onCancel={() => setEditRole(null)}
        />
      )}
      <div className="child md:p-10">
        <h1 className="pt-6 md:pt-0 pl-6">{name}</h1>
        <div className="pl-6 text-gray-500">{description}</div>

        {/* Stage */}
        <div className="h-44 h-full">
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
                      className="human-radius border border-gray-300 bg-yellow-50 w-20 h-20 md:w-28 md:h-28 "
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
                <div className="font-medium text-center w-20 md:w-28 m-2 break-words">
                  <div style={{lineHeight: "31px"}} className={moderators.includes(swarm.myPeerId) ? "inline-block bg-yellow-400 text-white font-light text-4xl w-4 h-4 text-center rounded-full" : "hidden"}>*</div>{myInfo.displayName}
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
                    title={peerId}
                    style={iModerate ? {cursor: 'pointer'} : undefined}
                    onClick={iModerate ? () => setEditRole(peerId) : undefined}
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
                          alt={peerId}
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
                    <div className="font-medium text-center w-20 md:w-28 m-2 break-words">
                      <div style={{lineHeight: "31px"}} className={moderators.includes(peerId) ? "inline-block bg-yellow-400 text-white font-light text-4xl w-4 h-4 text-center rounded-full" : "hidden"}>*</div>{peerInfo.displayName}
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
              className="flex-shrink w-24 h-24"
              style={{cursor: 'pointer'}}
              onClick={() => setEditIdentity(!editIdentity)}
            >
              <img
                className="human-radius border border-gray-300 bg-yellow-50"
                src={gravatarUrl(myInfo)}
              />
              {myInfo.displayName}
            </li>
          )}
          {audiencePeers.map(peerId => {
            let {inRoom} = peerState[peerId] || {};
            const peerInfo = identities[peerId] || {id: peerId};
            return (
              inRoom && (
                <li
                  key={peerId}
                  className="flex-shrink w-24 h-24"
                  style={iModerate ? {cursor: 'pointer'} : undefined}
                  onClick={iModerate ? () => setEditRole(peerId) : undefined}
                >
                  <img
                    className="human-radius border border-gray-300 bg-yellow-50"
                    alt={peerId}
                    src={gravatarUrl(peerInfo)}
                  />
                  {peerInfo.displayName}
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

        <div className="navigation">
          <div className="flex">
            <button
              onClick={() => state.set('micMuted', !micMuted)}
              className="select-none h-12 mr-2 px-6 text-lg text-black bg-yellow-200 rounded-lg focus:shadow-outline active:bg-yellow-300 flex-grow mt-10"
            >
              {micOn
                ? micMuted
                  ? "🙊 You're silent"
                  : "🐵 You're on"
                : "🙊 You're off"}
            </button>
          </div>

          <br />

          <button
            onClick={() => state.set('soundMuted', !soundMuted)}
            className="select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 flex-grow"
          >
            {soundMuted ? '🔇' : '🔊'} {soundMuted ? 'Off' : 'On'}
          </button>

          <br />
          <br />

          <div className="flex relative">
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
              className="select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
            >
              ✉️&nbsp;Share
            </button>

            <button className="select-none hidden h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 flex-grow">
              ✋🏽&nbsp;Raise&nbsp;hand
            </button>
          </div>

          <br />
          <br />
          <br />

          <button
            className="select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
            onClick={() => leaveRoom(roomId)}
          >
            🚪 Leave quietly
          </button>
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
    </div>
  );
}

function EditRole({peerId, addRole, removeRole, onCancel}) {
  return (
    <div className="child md:p-10">
      <h3 className="p-6 font-medium">Promote</h3>
      <br />
      <button
        onClick={() => addRole(peerId, 'speakers')}
        className="mt-5 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2"
      >
        Invite to Stage
      </button>
      <button
        onClick={() => removeRole(peerId, 'speakers')}
        className="mt-5 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2"
      >
        Move to Audience
      </button>
      <button
        onClick={() => addRole(peerId, 'moderators')}
        className="mt-5 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2"
      >
        Make Moderator
      </button>
      <button
        onClick={() => removeRole(peerId, 'moderators')}
        className="mt-5 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2"
      >
        Demote Moderator
      </button>
      <button
        onClick={onCancel}
        className="mt-5 h-12 px-6 text-lg text-black bg-gray-100 rounded-lg focus:shadow-outline active:bg-gray-300"
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
      <h3 className="p-6 font-medium">Profile</h3>
      <br />
      <form onSubmit={submit}>
        <input
          className="rounded placeholder-gray-300 bg-gray-50 w-64"
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
