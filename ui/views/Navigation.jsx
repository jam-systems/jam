import React, {useMemo, useState} from 'react';
import {leaveRoom} from '../logic/main';
import state from '../logic/state';
import {use} from 'use-minimal-state';
import copyToClipboard from '../lib/copy-to-clipboard';
import identity from '../logic/identity';
import {sendReaction, raiseHand} from '../logic/reactions';
import EditRole, {EditSelf} from './EditRole';
import {breakpoints, useWidth} from '../logic/tailwind-mqp';

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
}) {
  let [myAudio, micMuted, raisedHands, iSpeak] = use(state, [
    'myAudio',
    'micMuted',
    'raisedHands',
    'iAmSpeaker',
  ]);

  let micOn = myAudio?.active;

  let [showReactions, setShowReactions] = useState(false);
  let [showShareInfo, setShowShareInfo] = useState(false);

  let {name, color, speakers, moderators} = room || {};

  let isColorDark = useMemo(() => isDark(color), [color]);

  let myPeerId = identity.publicKey;
  let myHandRaised = raisedHands.has(myPeerId);

  let width = useWidth();

  return (
    <div
      className="z-10 bg-white p-4"
      style={{
        ...navigationStyle,
        ...(width < breakpoints.sm ? navigationStyleSmall : null),
        width: width < 720 ? '100%' : '700px',
      }}
    >
      {editRole && (
        <EditRole
          peerId={editRole}
          speakers={speakers}
          moderators={moderators}
          onCancel={() => setEditRole(null)}
        />
      )}
      {editSelf && <EditSelf onCancel={() => setEditSelf(false)} />}
      {/* microphone mute/unmute button */}
      {iSpeak && (
        <div className="flex">
          <button
            onClick={() => state.set('micMuted', !micMuted)}
            className="flex-grow select-none h-12 mt-4 px-6 text-lg text-white bg-gray-600 rounded-lg focus:outline-none active:bg-gray-600"
            style={{
              backgroundColor: color || '#4B5563',
              color: isColorDark ? 'white' : 'black',
            }}
          >
            {micOn
              ? micMuted
                ? "🙊 You're silent"
                : "🐵 You're on"
              : "🙊 You're off"}
          </button>

          {/* <button
              className="flex-shrink mt-4 ml-3 select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
              onClick={() => leaveStage(roomId)}
            >
              ↓ Leave Stage
            </button> */}
        </div>
      )}
      {!iSpeak && (
        <div className="flex relative">
          <button
            className="select-none h-12 px-6 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600 flex-grow"
            style={{
              backgroundColor: color || '#4B5563',
              color: isColorDark ? 'white' : 'black',
            }}
            onClick={() => {
              raiseHand(!myHandRaised);
            }}
          >
            {myHandRaised ? (
              <>Stop&nbsp;raising&nbsp;hand</>
            ) : (
              <>✋🏽&nbsp;Raise&nbsp;hand&nbsp;to&nbsp;get&nbsp;on&nbsp;stage</>
            )}
          </button>
        </div>
      )}
      <br />
      <div className="flex relative">
        {/* <button
            onClick={() => state.set('soundMuted', !soundMuted)}
            className="select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 flex-grow"
          >
            {soundMuted ? '🔇' : '🔊'}&nbsp;{soundMuted ? 'Off' : 'On'}
          </button> */}
        <button
          onClick={() => setShowReactions(s => !s)}
          className="flex-grow select-none text-center h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
        >
          {/* heroicons/emoji-happy */}
          <svg
            className="text-gray-600 w-6 h-6 inline-block"
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
                className="m-2 p-2 human-radius select-none px-3 bg-gray-100 active:bg-gray-50"
                key={r}
                onClick={() => {
                  sendReaction(r);
                }}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Share */}
        {showShareInfo && (
          <span
            style={{
              position: 'absolute',
              top: '-20px',
              right: '2px',
              fontSize: '13px',
            }}
          >
            Link copied to clipboard!
          </span>
        )}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: name || 'A Jam room',
                text: 'Hi, join me in this room on Jam.',
                url: location.href,
              });
            } else {
              copyToClipboard(location.href);
              setShowShareInfo(true);
              setTimeout(() => setShowShareInfo(false), 2000);
            }
          }}
          className="ml-3 select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
        >
          {/* heroicons/share-small */}
          <svg
            className="text-gray-600 w-5 h-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
          </svg>
        </button>

        {/* Leave */}
        <button
          className="flex-shrink ml-3 select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
          onClick={() => leaveRoom(roomId)}
        >
          🖖🏽&nbsp;Leave
        </button>
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
