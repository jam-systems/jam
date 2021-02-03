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
      <div className="child">
        <br/><br/><br/><br/><br/><br/><hr/><br/>
        <h1 className="font-book text-black text-xl3">Name of Room to Enter</h1>
        {/*
            re-using the "audience" class here for now to display speakers
            might make sense to switch to more generic names
            like avatar-big, avatar-medium and so on

            this can be a snapshot of current speakers or a snapshot of
            anticipated speakers for scheduled (future) rooms
        */}
        <ol className="flex space-x-4 pt-6">
        <li className="flex-shrink w-28 h-28 ring-yellow-500">
            <img className="rounded-full" src="img/avatars/sonic.jpg" />
          </li>
          <li className="flex-shrink w-28 h-28">
            <img className="rounded-full" src="img/avatars/gregor.jpg" />
            </li>
          <li className="flex-shrink w-28 h-28">
            <img className="rounded-full" src="img/avatars/christoph.jpg" />
          </li>
          <li className="flex-shrink w-28 h-28">
            <img className="rounded-full" src="img/avatars/tosh.jpg" />
          </li>
        </ol>
        <p className="text-gray-500">This is a description of the Room you are about to Enter so you have more context. This description is optional.</p>
        {/*
            optional (for future events:)
            when is this event?
        */}
        <p className="pt-4 pb-4">🗓 February 3rd 2021 at ⌚️ 14:06 (Vienna Time)</p>
        {/*
            button for entering this room
            for now this is possible without

            * auth
            * without picking a name
            * without access to microphone

            think: "Tasty Strawberry" (Google Docs et al)
            this makes it easy to join and tune in less intimate (identity)
            but a decent baseline. we can add other rules (informal + formal)
            in the future
        */ }
        <button>🚪 Join this room</button>
        {/*
            if it is a future/scheduled room this button could be replaced with
        */}
        <button>🔔 Alert me when this room goes live</button>

        <button>🗓 Add a reminder to my calendar</button>
      </div>
    </div>
  );
}
