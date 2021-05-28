import React from 'react';
import {use} from 'use-minimal-state';
import {enterRoom} from '../logic/main';
import {useMqParser} from '../lib/tailwind-mqp';
import Container from './Container';
import RoomHeader from './RoomHeader';
import {useStateObject} from './StateContext';

const iOS =
  /^iP/.test(navigator.platform) ||
  (/^Mac/.test(navigator.platform) && navigator.maxTouchPoints > 4);

const macOS = /^Mac/.test(navigator.platform) && navigator.maxTouchPoints === 0;

export default function EnterRoom({
  roomId,
  name,
  description,
  schedule,
  closed,
  buttonURI,
  buttonText,
  logoURI,
}) {
  const state = useStateObject();
  let mqp = useMqParser();
  let otherDevice = use(state, 'otherDeviceInRoom');
  return (
    <Container>
      <div className={mqp('p-2 pt-60 md:p-10 md:pt-60')}>
        <RoomHeader {...{name, description, logoURI, buttonURI, buttonText}} />
        {/*
            optional (for future events:)
            when is this event?
        */}
        <p className="hidden pt-4 pb-4">
          🗓 February 3rd 2021 at ⌚️ 14:06 (Vienna Time)
        </p>
        {/* warning if peer is in the same room on another device */}
        {otherDevice && (
          <div
            className={
              'mt-5 mb--1 p-4 text-gray-700 rounded-lg border border-yellow-100 bg-yellow-50'
            }
          >
            <span className="text-gray-900 bg-yellow-200">Warning:</span> You
            already joined this room from a different device or browser tab.
            Click {`'`}
            Join{`'`} to switch to this tab.
          </div>
        )}
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
              : 'mt-5 select-none w-full h-12 px-6 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600'
          }
        >
          Join
        </button>

        <a
          className={
            schedule
              ? 'block mt-5 text-center h-12 p-3 px-6 text-lg text-gray-500'
              : 'hidden'
          }
          href={`/${roomId}.ics`}
          download={`${name || 'room'}.ics`}
        >
          🗓 Add to Calendar
        </a>

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
