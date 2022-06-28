import React, {useMemo, useState} from 'react';
import {is, use} from 'use-minimal-state';
import EditRole, {EditSelf} from './EditRole';
import {breakpoints, useWidth} from '../lib/tailwind-mqp';
import {colors} from '../lib/theme';
import {openModal} from './Modal';
import {InfoModal} from './InfoModal';
import {MicOffSvg, MicOnSvg} from './Svg';
import {useJam} from '../jam-core-react';

const reactionEmojis = ['❤️', '💯', '😂', '😅', '😳', '🤔'];

let navigationStyle = {
  position: 'fixed',
  bottom: '0',
  marginLeft: '-15px',
  flex: 'none',
  borderLeft: '2px solid lightgrey',
  borderRight: '2px solid lightgrey',
};

let navigationStyleSmall = {
  padding: '0 22px 22px 22px',
  marginLeft: '-12px',
  boxSizing: 'border-box',
  borderLeft: '0px',
  borderRight: '0px',
};

export default function Navigation({
  roomId,
  room,
  editRole,
  setEditRole,
  editSelf,
  setEditSelf,
  noLeave,
}) {
  const [state, {leaveRoom, sendReaction, retryMic, setProps}] = useJam();
  let [myAudio, micMuted, handRaised, iSpeak] = use(state, [
    'myAudio',
    'micMuted',
    'handRaised',
    'iAmSpeaker',
  ]);

  let micOn = myAudio?.active;

  let [showReactions, setShowReactions] = useState(false);

  let {speakers, moderators, stageOnly} = room ?? {};

  const roomColors = colors(room);

  let isColorDark = useMemo(() => isDark(roomColors.buttonPrimary), [
    roomColors,
  ]);

  let width = useWidth();

  let backgroundColor = roomColors.background;

  let talk = () => {
    if (micOn) {
      setProps('micMuted', !micMuted);
    } else {
      retryMic();
    }
  };

  return (
    <div
      className="z-10 p-4"
      style={{
        ...navigationStyle,
        ...(width < breakpoints.sm ? navigationStyleSmall : null),
        width: width < 720 ? '100%' : '700px',
        backgroundColor,
      }}
    >
      {editRole && (
        <EditRole
          peerId={editRole}
          speakers={speakers}
          moderators={moderators}
          stageOnly={stageOnly}
          onCancel={() => setEditRole(null)}
        />
      )}
      {editSelf && <EditSelf onCancel={() => setEditSelf(false)} />}
      {/* microphone mute/unmute button */}
      {/* TODO: button content breaks between icon and text on small screens. fix by using flexbox & text-overflow */}
      <div className="flex">
        <button
          onClick={iSpeak ? talk : () => setProps('handRaised', !handRaised)}
          onKeyUp={e => {
            // don't allow clicking mute button with space bar to prevent confusion with push-to-talk w/ space bar
            if (e.key === ' ') e.preventDefault();
          }}
          className="flex-grow select-none h-12 mt-4 px-6 text-lg text-white bg-gray-600 rounded-lg focus:outline-none active:bg-gray-600"
          style={{
            backgroundColor: roomColors.buttonPrimary,
            color: isColorDark ? 'white' : 'black',
          }}
        >
          {iSpeak && (
            <>
              {micOn && micMuted && (
                <>
                  <MicOffSvg
                    className="w-5 h-5 mr-2 opacity-80 inline-block"
                    stroke={roomColors.buttonPrimary}
                  />
                  Your&nbsp;microphone&nbsp;is&nbsp;off
                </>
              )}
              {micOn && !micMuted && (
                <>
                  <MicOnSvg
                    className="w-5 h-5 mr-2 opacity-80 inline-block"
                    stroke={roomColors.buttonPrimary}
                  />
                  Your&nbsp;microphone&nbsp;is&nbsp;on
                </>
              )}
              {!micOn && <>Allow&nbsp;microphone&nbsp;access</>}
            </>
          )}
          {!iSpeak && (
            <>
              {handRaised ? (
                <>Stop&nbsp;raising&nbsp;hand</>
              ) : (
                <>✋🏽&nbsp;Raise&nbsp;hand&nbsp;to&nbsp;get&nbsp;on&nbsp;stage</>
              )}
            </>
          )}
        </button>
      </div>
      <br />
      <div className="flex relative">
        <button
          onClick={() => setShowReactions(s => !s)}
          className="flex-grow select-none text-center h-12 px-6 text-lg text-black rounded-lg focus:shadow-outline"
          style={{backgroundColor: roomColors.buttonSecondary}}
        >
          {/* heroicons/emoji-happy */}
          <svg
            className="w-6 h-6 inline-block"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
        {showReactions && (
          <div className="text-4xl w-64 flex-shrink text-black text-center bg-gray-200 rounded-lg absolute left-0 bottom-14">
            {reactionEmojis.map(r => (
              <button
                className="m-2 p-2 human-radius select-none px-3"
                key={r}
                onClick={() => {
                  sendReaction(r);
                }}
                style={{backgroundColor: roomColors.buttonSecondary}}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Info */}
        <button
          onClick={() => {
            openModal(InfoModal, {roomId, room});
          }}
          className="hidden ml-3 select-none h-12 px-6 text-lg text-black rounded-lg focus:shadow-outline"
          style={{backgroundColor: roomColors.buttonSecondary}}
        >
          {/* information-circle */}
          <svg
            className="w-6 h-6"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        {/* Leave */}
        {!noLeave && (
          <button
            className="flex-shrink ml-3 select-none h-12 px-6 text-lg text-black rounded-lg focus:shadow-outline"
            onClick={() => leaveRoom(roomId)}
            style={{backgroundColor: roomColors.buttonSecondary}}
          >
            🖖🏽&nbsp;Leave
          </button>
        )}
      </div>
    </div>
  );
}

function isDark(hex) {
  if (!hex) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r + g + b < 128 * 3;
}
