import React, {useMemo, useState} from 'react';
import {createRoom} from '../backend';
import swarm from '../lib/swarm.js';
import {navigate} from '../lib/use-location';
import {enterRoom} from '../main';

export default function Start({urlRoomId, displayRoom}) {
  let randomId = useMemo(() => Math.random().toString(36).substr(2, 6), []);
  let [customId, setRoomId] = useState(urlRoomId || '');
  let [name, setName] = useState('');
  let roomId = customId || randomId;

  let submit = async e => {
    e.preventDefault();
    await createRoom(roomId, name, swarm.myPeerId);
    if (urlRoomId !== roomId) navigate('/' + roomId);
    enterRoom(roomId);
    displayRoom();
  };
  return (
    <div className="container">
      <div className="child">
        <h1>Welcome to Jam</h1>
        <p>
          <img alt="Jam Logo" src="/img/jam-logo.jpg" />
        </p>
        <form onSubmit={submit}>
          <p>
            <input
              autoFocus
              className="rounded m-2 placeholder-gray-600"
              type="text"
              placeholder="Room name"
              value={name}
              onChange={e => {
                setName(e.target.value);
              }}
            ></input>
            <input
              className="rounded m-2 placeholder-gray-600"
              type="text"
              placeholder={randomId}
              value={customId}
              onChange={e => {
                setRoomId(e.target.value);
              }}
            ></input>
          </p>
          <button
            onClick={submit}
            className="h-12 px-6 m-2 text-lg text-black transition-colors duration-150 bg-gray-300 rounded-lg focus:shadow-outline hover:bg-gray-400"
          >
            🌱 Start room
          </button>
        </form>
      </div>
    </div>
  );
}
