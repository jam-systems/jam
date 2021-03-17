import React from 'react';
import {enterRoom} from '../logic/main';
import {useMqParser} from '../logic/tailwind-mqp';
import Container from './Container';
import RoomHeader from './RoomHeader';

const iOS =
  /^iP/.test(navigator.platform) ||
  (/^Mac/.test(navigator.platform) && navigator.maxTouchPoints > 4);

const macOS = /^Mac/.test(navigator.platform) && navigator.maxTouchPoints === 0;

export default function EnterRoom({
  roomId,
  name,
  description,
  closed,
  buttonURI,
  buttonText,
  logoURI,
}) {
  let mqp = useMqParser();
  return (
    <Container>
      <div className={mqp('p-2 pt-60 md:p-10 md:pt-60')}>
        <RoomHeader {...{name, description, logoURI, buttonURI, buttonText}} />

        {/*
            a snapshot of current or nticipated speakers
            (for scheduled (future) rooms)
        */}
        <ol className="hidden flex space-x-4 pt-6">
          <li className="flex-shrink w-28 h-28 ring-yellow-500">
            <img
              className="human-radius border border-gray-300"
              src="img/avatars/sonic.jpg"
            />
          </li>
          <li className="flex-shrink w-28 h-28">
            <img
              className="human-radius border border-gray-300"
              src="img/avatars/gregor.jpg"
            />
          </li>
          <li className="flex-shrink w-28 h-28">
            <img
              className="human-radius border border-gray-300"
              src="img/avatars/christoph.jpg"
            />
          </li>
          <li className="flex-shrink w-28 h-28">
            <img
              className="human-radius border border-gray-300"
              src="img/avatars/tosh.jpg"
            />
          </li>
        </ol>
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
          className={
            closed
              ? 'hidden'
              : 'mt-5 mb-10 select-none w-full h-12 px-6 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600'
          }
        >
          Join this Jam
        </button>

        <div className={iOS ? 'mt-40 text-gray-500 text-center' : 'hidden'}>
          🎧 Use headphones or earbuds
          <br />
          for the best audio experience on iOS
        </div>

        <div className={macOS ? 'mt-40 text-gray-500 text-center' : 'hidden'}>
          🎧 Use Chrome or Firefox instead of Safari
          <br />
          for the best audio experience on macOS
        </div>
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
    </Container>
  );
}
