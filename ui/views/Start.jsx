import React, {useState} from 'react';
import slugify from 'slugify';

import {createRoom} from '../backend';
import swarm from '../lib/swarm.js';
import {navigate} from '../lib/use-location';
import {enterRoom} from '../main';

export default function Start({urlRoomId}) {
  // let randomId = useMemo(() => Math.random().toString(36).substr(2, 6), []);
  // let [customId, setRoomId] = useState(urlRoomId || '');
  let [name, setName] = useState('');
  // let roomId = customId || randomId;

  let submit = async e => {
    e.preventDefault();
    if (!name) return;
    let slug = slugify(name, {lower: true, strict: true});
    let roomId = slug + '-' + Math.random().toString(36).substr(2, 4);
    await createRoom(roomId, name, swarm.myPeerId);
    if (urlRoomId !== roomId) navigate('/' + roomId);
    enterRoom(roomId);
  };
  return (
    <div className="container">
      <div className="child">
        <h1>Welcome to Jam</h1>

        <div className="flex flex-row pt-4 pb-4">
          <div className="flex-1 text-gray-600 pt-6">
            Jam is an <span className="italic">audio space</span>
            <br />
            for chatting, brainstorming, debating, jamming, micro-conferences
            and more.
            <br />
            <br />
            <a href="/" className="underline text-blue-800 hover:text-blue-600">
              Learn more about Jam.
            </a>
          </div>
          <div className="flex-1">
            <img
              className="p-4"
              style={{width: 170, height: 170}}
              alt="Jam mascot"
              title="Jam mascot"
              src="/img/jam-illustration.png"
            />
          </div>
        </div>

        <hr />

        <br />
        <br />

        <form onSubmit={submit}>
          <input
            autoFocus
            className="rounded placeholder-gray-300 bg-gray-50 w-2/3"
            type="text"
            placeholder="Room topic"
            value={name}
            name="jam-room-topic"
            autoComplete="off"
            onChange={e => {
              setName(e.target.value);
            }}
          ></input>
          <p className="p-2 text-gray-500 italic">
            Pick a topic to talk about.
          </p>
          {/* <input
            className="hidden"
            type="text"
            placeholder={randomId}
            value={customId}
            onChange={e => {
              setRoomId(e.target.value);
            }}
          ></input> */}

          <button
            onClick={submit}
            className="mt-5 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline hover:bg-gray-300"
          >
            🌱 Start room
          </button>
        </form>
      </div>
    </div>
  );
}
