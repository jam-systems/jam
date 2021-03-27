import React, {useMemo, useState} from 'react';
import {leaveRoom} from '../logic/main';
import state from '../logic/state';
import {use} from 'use-minimal-state';
import copyToClipboard from '../lib/copy-to-clipboard';
import identity from '../logic/identity';
import {sendReaction, raiseHand} from '../logic/reactions';
import EditRole, {EditSelf} from './EditRole';
import {breakpoints, useWidth} from '../logic/tailwind-mqp';
import UAParser from 'ua-parser-js';

const reactionEmojis = ['❤️', '💯', '😂', '😅', '😳', '🤔'];

var userAgent = UAParser();

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

  let {name, color, speakers, moderators, shareUrl} = room || {};

  let isColorDark = useMemo(() => isDark(color), [color]);

  let myPeerId = identity.publicKey;
  let myHandRaised = raisedHands.has(myPeerId);

  let width = useWidth();

  let talk = (e) => {
    if (micOn) {
      state.set('micMuted', !micMuted);
    } else {
      // reload page to get back to microphone permissions
      // on iOS and macOS Safari
      location.reload();
    }
  }

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
            onClick={() => talk()}
            className="flex-grow select-none h-12 mt-4 px-6 text-lg text-white bg-gray-600 rounded-lg focus:outline-none active:bg-gray-600"
            style={{
              backgroundColor: color || '#4B5563',
              color: isColorDark ? 'white' : 'black',
            }}
          >
            <div className={
              micOn
              ? micMuted
                ? ""
                : "hidden"
              : "hidden"}>
              <svg
                className="w-5 h-5 mr-2 text-gray-300 inline-block"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink"
                x="0px"
                y="0px"
                width="96.666px"
                height="96.666px"
                viewBox="0 0 96.666 96.666"
                xml:space="preserve"
                fill="currentColor"
                stroke="#374151"
                style={{transform: 'scale(-1,1)'}}
              >
                <g>
                  <g>
                    <path d="M65.595,56.035V43.349L38.639,70.307c2.766,1.885,6.104,2.989,9.695,2.989C57.852,73.296,65.595,65.553,65.595,56.035z"/>
                    <path d="M76.078,45.715H72.64c-1.104,0-2,0.896-2,2v7.029c0,12.3-10.007,22.308-22.308,22.308c-4.654,0-8.979-1.435-12.559-3.882
                      l-5.245,5.245c4.037,3.084,8.856,5.177,14.086,5.835v4.98h-15.35c-1.104,0-2,0.896-2,2v3.436c0,1.104,0.896,2,2,2h38.138
                      c1.104,0,2-0.896,2-2V91.23c0-1.104-0.896-2-2-2H52.051v-4.98c14.594-1.838,26.026-14.799,26.026-29.506v-7.029
                      C78.078,46.61,77.182,45.715,76.078,45.715z"/>
                    <path d="M85.972,7.694c-2.146-2.147-5.631-2.147-7.777,0l-12.6,12.6v-3.032C65.595,7.743,57.852,0,48.333,0
                      c-9.519,0-17.262,7.743-17.262,17.262v37.554l-4.552,4.552c-0.317-1.493-0.494-3.038-0.494-4.624v-7.029c0-1.104-0.896-2-2-2
                      h-3.437c-1.104,0-2,0.896-2,2v7.029c0,3.67,0.726,7.227,2.022,10.533l-9.917,9.916c-2.148,2.148-2.148,5.631,0,7.779
                      c1.073,1.073,2.481,1.61,3.889,1.61s2.815-0.537,3.889-1.61l67.5-67.5C88.121,13.324,88.121,9.842,85.972,7.694z"/>
                  </g>
                </g>
              </svg>
              Your microphone is off
            </div>
            <div className={
              micOn
              ? micMuted
                ? "hidden"
                : ""
              : "hidden"}>
              <svg
                className="w-5 h-5 mr-2 text-gray-300 inline-block"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink"
                x="0px"
                y="0px"
                width="96.666px"
                height="96.666px"
                viewBox="0 0 96.666 96.666"
                xml:space="preserve"
                fill="currentColor"
                stroke="#374151"
              >
                <g>
                  <g>
                    <path d="M48.333,73.296c9.519,0,17.263-7.744,17.263-17.262V17.262C65.596,7.743,57.852,0,48.333,0
                      c-9.519,0-17.262,7.743-17.262,17.262v38.773C31.071,65.553,38.814,73.296,48.333,73.296z"/>
                    <path d="M76.078,45.715h-3.437c-1.104,0-2,0.896-2,2v7.029c0,12.3-10.008,22.308-22.309,22.308S26.025,67.044,26.025,54.744
                      v-7.029c0-1.104-0.896-2-2-2h-3.437c-1.104,0-2,0.896-2,2v7.029c0,14.707,11.433,27.667,26.026,29.506v4.98h-15.35
                      c-1.104,0-2,0.896-2,2v3.436c0,1.104,0.896,2,2,2h38.138c1.104,0,2-0.896,2-2V91.23c0-1.104-0.896-2-2-2H52.051v-4.98
                      c14.594-1.838,26.026-14.799,26.026-29.506v-7.029C78.078,46.61,77.182,45.715,76.078,45.715z"/>
                  </g>
                </g>
              </svg>
              Your microphone is on
            </div>
            {micOn
              ? micMuted
                ? ""
                : ""
              : "Allow microphone access"}
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
                url: (shareUrl ? shareUrl : location.href),
              });
            } else {
              copyToClipboard((shareUrl ? shareUrl : location.href));
              setShowShareInfo(true);
              setTimeout(() => setShowShareInfo(false), 2000);
            }
          }}
          className="ml-3 select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
        >
          {/* heroicons/share-small */}
          <svg
            className={userAgent.os.name == "Android" ? "text-gray-600 w-5 h-5" : "hidden"}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
          </svg>
          <svg
            className={userAgent.os?.name == "Android" ? "hidden" : "text-gray-600 w-5 h-5"}
            viewBox="0 0 512 512"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
          >
            <g id="Solid">
              <path d="m182.461 155.48 49.539-49.539v262.059a24 24 0 0 0 48 0v-262.059l49.539 49.539a24 24 0 1 0 33.941-33.941l-90.509-90.51a24 24 0 0 0 -33.942 0l-90.509 90.51a24 24 0 1 0 33.941 33.941z"/>
              <path d="m464 232a24 24 0 0 0 -24 24v184h-368v-184a24 24 0 0 0 -48 0v192a40 40 0 0 0 40 40h384a40 40 0 0 0 40-40v-192a24 24 0 0 0 -24-24z"/>
            </g>
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
