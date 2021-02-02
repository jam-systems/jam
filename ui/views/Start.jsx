import React, {useMemo, useState} from 'react';
import {createRoom} from '../backend';
import swarm from '../lib/swarm.js';
import {navigate} from '../lib/use-location';

export default function Start({urlRoomId, displayRoom}) {
  let randomId = useMemo(() => Math.random().toString(36).substr(2, 6), []);
  let [customId, setRoomId] = useState(urlRoomId || '');
  let roomId = customId || randomId;

  let submit = async e => {
    e.preventDefault();
    await createRoom(roomId, swarm.myPeerId);
    if (urlRoomId !== roomId) navigate('/' + roomId);
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
              type="text"
              placeholder={randomId}
              value={customId}
              autoFocus
              onChange={e => {
                e.preventDefault();
                setRoomId(e.target.value);
              }}
            ></input>
          </p>

          <button onClick={submit}>🌱 Create a new room</button>
        </form>
      </div>
    </div>
  );
}
