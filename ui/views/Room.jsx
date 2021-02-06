import React, {useState} from 'react';
import {createAudioContext, enterRoom, leaveRoom, state} from '../main';
import use from '../lib/use-state.js';
import swarm from '../lib/swarm.js';
import EnterRoom from './EnterRoom.jsx';
import {gravatarUrl} from "../lib/gravatar";
import slugify from "slugify";
import {createRoom} from "../backend";
import {navigate} from "../lib/use-location";

// TODOs:
// -) wire speakers, mod lists to UI

export default function Room({room, roomId}) {
  let myInfo = use(state, 'myInfo');
  let myAudio = use(state, 'myAudio');
  let micOn = myAudio?.active;
  let micMuted = use(state, 'micMuted');
  let soundMuted = use(state, 'soundMuted');
  let speaking = use(state, 'speaking');
  let enteredRooms = use(state, 'enteredRooms');
  let editIdentity = use(state, 'editIdentity');
  let streams = use(swarm, 'remoteStreams');
  let name = room?.name;
  let description = room?.description;

  let [displayName, setDisplayName] = useState(myInfo.displayName);
  let [email, setEmail] = useState(myInfo.email);


  let updateInfo = e => {
    e.preventDefault();
    state.set('myInfo', {displayName, email})
    state.set('editIdentity', false);
  };


  if (!enteredRooms.has(roomId))
    return <EnterRoom roomId={roomId} name={name} description={description} />;

  return (

    <div className="container">
      {editIdentity && (
          <div className="child">
            <form onSubmit={updateInfo}>
              <input
                  className="rounded placeholder-gray-300 bg-gray-50 w-64"
                  type="text"
                  placeholder="DisplayName"
                  value={displayName}
                  name="display-name"
                  onChange={e => {
                    setDisplayName(e.target.value);
                  }}
              />
              <br />
              <input
                  className="rounded placeholder-gray-300 bg-gray-50 w-64"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  name="email"
                  onChange={e => {
                    setEmail(e.target.value);
                  }}
              />
              <br />
              <button
                  onClick={updateInfo}
                  className="mt-5 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline hover:bg-gray-300"
              >
                Update Info
              </button>
            </form>
            <br />
            <hr />
          </div>

      )}
      <div className="child">
        <h1>{name}</h1>
        <div className="text-gray-500">
          {description}
        </div>

        <ol className="flex space-x-4 pt-6">
          {micOn && (
            <li className="flex-shrink w-28 h-28 text-center"
                onClick={() => state.set('editIdentity', !editIdentity)}
            >
              <div
                className={
                  speaking.has('me')
                    ? 'human-radius p-1 ring-4 ring-gray-300'
                    : 'human-radius p-1 ring-4 ring-white'
                }
              >
                <img
                  className="human-radius border border-gray-300 bg-gray-300"
                  alt="me"
                  src={gravatarUrl(myInfo)}
                />
              </div>
              <div className="pt-2 font-medium">{myInfo.displayName}</div>
            </li>
          )}
          {streams.map(({stream, peerId}) =>
            !stream ? undefined : (
              <li
                key={peerId}
                className="flex-shrink w-28 h-28 text-center"
                title={peerId}
              >
                <div
                  className={
                    speaking.has(peerId)
                      ? 'human-radius p-1 ring-4 ring-gray-300'
                      : 'human-radius p-1 ring-4 ring-white'
                  }
                >
                  <img
                    className="human-radius border border-gray-300 bg-gray-300"
                    alt={peerId}
                    src={gravatarUrl({id: peerId})}
                  />
                </div>
                <div className="pt-2 font-medium">
                  {peerId.substring(0, 2).toUpperCase()}
                </div>
              </li>
            )
          )}
        </ol>

        <h3 className="hidden" style={{marginTop: '80px'}}>
          Audience
        </h3>
        <ol className="hidden flex space-x-4 pt-6">
          <li className="flex-shrink w-24 h-24 ring-yellow-500">
            <img
              className="human-radius border border-gray-300"
              src="img/avatars/sonic.jpg"
            />
          </li>
          <li className="flex-shrink w-24 h-24">
            <img
              className="human-radius border border-gray-300"
              src="img/avatars/gregor.jpg"
            />
          </li>
          <li className="flex-shrink w-24 h-24">
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
          </li>
        </ol>

        <div className="mt-10 navigation">
          {/* <div className="flex">
            <button
              onClick={requestAudio}
              className="h-12 px-6 m-2 text-lg text-black bg-yellow-200 rounded-lg focus:shadow-outline hover:bg-yellow-300 flex-grow mt-10"
            >
              🔊 Listen and speak
            </button>
          </div> */}
          <div className="flex">
            <button
              onClick={() => state.set('micMuted', !micMuted)}
              className="h-12 px-6 m-2 text-lg text-black bg-yellow-200 rounded-lg focus:shadow-outline hover:bg-yellow-300 flex-grow mt-10"
              style={{flex: '1 0 0'}}
            >
              🎙️ {micOn ? (micMuted ? 'Muted' : 'On') : 'Off'}
            </button>

            <button
              onClick={() => state.set('soundMuted', !soundMuted)}
              className="h-12 px-6 m-2 text-lg text-black bg-yellow-200 rounded-lg focus:shadow-outline hover:bg-yellow-300 flex-grow mt-10"
              style={{flex: '1 0 0'}}
            >
              {soundMuted ? '🔇' : '🔊'} {soundMuted ? 'Off' : 'On'}
            </button>
          </div>

          <br />

          {/*
            TODO: maybe we should hide this button on platforms where navigator.share does nothing, or implement a simple replacement like
            "Share link was copied to your clipboard!"
          */}
          <div className="flex">
            <button
              onClick={() => {
                navigator.share({
                  title: name || 'A Jam room',
                  text: 'Hi, join me in this room on Jam.',
                  url: window.location.href,
                });
              }}
              className="h-12 px-6 m-2 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline hover:bg-gray-300"
            >
              ✉️&nbsp;Share
            </button>

            <button className="hidden h-12 px-6 m-2 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline hover:bg-gray-300 flex-grow">
              ✋🏽&nbsp;Raise&nbsp;hand
            </button>
          </div>

          <br />
          <br />
          <br />

          <button
            className="h-12 px-6 m-2 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline hover:bg-gray-300"
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
              <p className="text-gray-500">Product, UX, StarCraft, Clojure, …</p>
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
              <p className="text-gray-500">Product, UX, StarCraft, Clojure, …</p>
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
              <p className="text-gray-500">Product, UX, StarCraft, Clojure, …</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
