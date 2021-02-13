import React from 'react';
import {enterRoom} from '../main';

export default function EnterRoom({roomId, name, description}) {
  return (
    <div className="container md:min-h-full">
      <div className="child md:p-10">
        <h1 className="pl-2  pt-6 font-book text-black text-xl3">{name || ''}</h1>
        {/*
            a snapshot of current or nticipated speakers
            (for scheduled (future) rooms)
        */}
        <ol className="hidden flex space-x-4 pt-6">
          <li className="flex-shrink w-28 h-28 ring-yellow-500">
            <img className="human-radius border border-gray-300" src="img/avatars/sonic.jpg" />
          </li>
          <li className="flex-shrink w-28 h-28">
            <img className="human-radius border border-gray-300" src="img/avatars/gregor.jpg" />
          </li>
          <li className="flex-shrink w-28 h-28">
            <img className="human-radius border border-gray-300" src="img/avatars/christoph.jpg" />
          </li>
          <li className="flex-shrink w-28 h-28">
            <img className="human-radius border border-gray-300" src="img/avatars/tosh.jpg" />
          </li>
        </ol>
        <p className="pl-2 text-gray-500">
          {description || 'This is a Room on Jam'}
        </p>
        {/*
            optional (for future events:)
            when is this event?
        */}
        <p className="hidden pt-4 pb-4">
          🗓 February 3rd 2021 at ⌚️ 14:06 (Vienna Time)
        </p>
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
        */}
        <button
          onClick={() => enterRoom(roomId)}
          className="mb-10 select-none mt-5 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
        >
          🐾 &nbsp;Join this Jam
        </button>
        {/*
            if it is a future/scheduled room this button could be replaced with
        */}
        <button className="hidden h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300">
          ⏰ Alert me 5 min before
        </button>

        <button className="hidden h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300">
          🗓 Add this to my calendar
        </button>
      </div>
    </div>
  );
}
