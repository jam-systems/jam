import React from 'react';
import {requestAudio, leaveRoom, state} from '../main';
import use from '../lib/use-state';
import swarm from '../lib/swarm';
import EnterRoom from './EnterRoom';

// TODOs:
// -) wire speakers, mod lists to UI

export default function Room({room, roomId}) {
  let myStream = use(state, 'myAudio');
  let speaking = use(state, 'speaking');
  let enteredRooms = use(state, 'enteredRooms');
  let streams = use(swarm, 'remoteStreams');
  let name = room?.name;

  if (!enteredRooms.has(roomId))
    return <EnterRoom roomId={roomId} name={name} />;

  return (
    <div className="container">
      <div className="child">
        <h1>{name}</h1>

        <ol className="flex space-x-4 pt-6">
          {myStream && (
            <li className="flex-shrink w-28 h-28 text-center">
              <div
                className={
                  speaking.has('me')
                    ? 'human-radius p-1 ring-4 ring-gray-300'
                    : 'human-radius p-1 ring-4 ring-white'
                }
              >
                <img
                  className="human-radius border border-gray-300"
                  src="img/avatars/sonic.jpg"
                />
              </div>
            </li>
          )}
          {streams.map(({stream, peerId}) =>
            !stream ? undefined : (
              <li
                key={peerId}
                className="flex-shrink w-28 h-28 text-center"
                title={peerId}
                alt={peerId}
              >
                <div
                  className={
                    speaking.has(peerId)
                      ? 'human-radius p-1 ring-4 ring-gray-300'
                      : 'human-radius p-1 ring-4 ring-white'
                  }
                >
                  <img
                    className="human-radius border border-gray-300"
                    src="img/avatars/sonic.jpg"
                  />
                </div>
              </li>
            )
          )}
        </ol>

        <h3 style={{marginTop: '80px'}}>Audience</h3>
        <ol className="flex space-x-4 pt-6">
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
          <div className="flex">
            <button
              onClick={requestAudio}
              className="h-12 px-6 m-2 text-lg text-black bg-yellow-200 rounded-lg focus:shadow-outline hover:bg-yellow-300 flex-grow mt-10"
            >
              🔊 Listen and speak
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

            <button className="h-12 px-6 m-2 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline hover:bg-gray-300 flex-grow">
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
  );
}
