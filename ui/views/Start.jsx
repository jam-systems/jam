import React, {useState} from 'react';
import slugify from 'slugify';

import {createRoom} from '../backend';
import swarm from '../lib/swarm.js';
import {navigate} from '../lib/use-location';
import {createAudioContext, enterRoom} from '../main';

export default function Start({urlRoomId}) {
  let [name, setName] = useState('');
  let [description, setDescription] = useState('');

  let submit = e => {
    e.preventDefault();
    let roomId;
    if (name) {
      let slug = slugify(name, {lower: true, strict: true});
      roomId = slug + '-' + Math.random().toString(36).substr(2, 4);
    } else {
      roomId = Math.random().toString(36).substr(2, 6);
    }

    // createAudioContext();
    (async () => {
      await createRoom(roomId, name, description, swarm.myPeerId);
      if (urlRoomId !== roomId) navigate('/' + roomId);
      enterRoom(roomId);
    })();
  };
  return (
    <div className="container">
      <div className="child md:p-10">
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
              style={{width: 130, height: 130}}
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
            className="rounded placeholder-gray-300 bg-gray-50 w-64"
            type="text"
            placeholder="Room topic"
            value={name}
            name="jam-room-topic"
            autoComplete="off"
            onChange={e => {
              setName(e.target.value);
            }}
          ></input>
          <div className="p-2 text-gray-500 italic">
            Pick a topic to talk about.{' '}
            <span className="text-gray-300">(optional)</span>
          </div>
          <br />
          <input
            className="rounded placeholder-gray-300 bg-gray-50 w-64 md:w-96"
            type="text"
            placeholder="Room description"
            value={description}
            name="jam-room-description"
            autoComplete="off"
            onChange={e => {
              setDescription(e.target.value);
            }}
          ></input>
          <div className="p-2 text-gray-500 italic">
            Describe what this room is about.{' '}
            <span className="text-gray-300">(optional)</span>
          </div>

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
