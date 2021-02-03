import React from 'react';
import {enterJamRoom, leaveJamRoom, state} from '../main';
import use from '../lib/use-state';
import swarm from '../lib/swarm';

export default function Room() {
  let myStream = use(state, 'myAudio');
  let speaking = use(state, 'speaking');
  let streams = use(swarm, 'remoteStreams');
  return (
    <div className="container">
      <div className="child">
        <h1>Reddit vs Hedge Funds</h1>

        <h3 style={{marginTop: '80px'}}>Stage</h3>
        <table className="stage">
          <tbody>
            <tr>
              {myStream && (
                <td className={speaking.has('me') ? 'speaking' : undefined}>
                  <img src="img/avatars/tosh.jpg" />
                  <span className={speaking.has('me') ? 'visible animate-ping flex h-3 w-10 relative top-0 right-0 -mt-6' : 'invisible animate-ping flex h-3 w-10 relative top-0 right-0 -mt-6'}>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-600 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-10 bg-green-800"></span>
                  </span>
                </td>
              )}
              {streams.map(({stream, peerId}) =>
                !stream ? undefined : (
                  <td
                    key={peerId}
                    className={speaking.has(peerId) ? 'speaking' : undefined}
                    title={peerId}
                    alt={peerId}
                  >
                    <img className={speaking.has(peerId) ? 'animate-ping' : undefined} src="img/avatars/sonic.jpg" />
                  </td>
                )
              )}
            </tr>
          </tbody>
        </table>

        <h3 style={{marginTop: '80px'}}>Audience</h3>
        <table className="audience">
          <tbody>
            <tr>
              <td>
                <img src="img/avatars/sonic.jpg" />
              </td>
              <td>
                <img src="img/avatars/gregor.jpg" />
              </td>
              <td>
                <img src="img/avatars/christoph.jpg" />
              </td>
              <td>
                <img src="img/avatars/tosh.jpg" />
              </td>
            </tr>
          </tbody>
        </table>

        <div className="navigation" style={{marginTop: '80px'}}>
          <button className="h-12 px-6 m-2 text-lg text-black transition-colors duration-150 bg-gray-300 rounded-lg focus:shadow-outline hover:bg-gray-400" onClick={leaveJamRoom}>
            🚪 Leave quietly
          </button>

          <button className="h-12 px-6 m-2 text-lg text-black transition-colors duration-150 bg-gray-300 rounded-lg focus:shadow-outline hover:bg-gray-400">
            ✋🏽 Raise hand
          </button>

          <button onClick={function(e) {navigator.share({title: "Room Name", text: "Hi, join me in this room on Jam.", url: window.location.href})}} className="h-12 px-6 m-2 text-lg text-black transition-colors duration-150 bg-gray-300 rounded-lg focus:shadow-outline hover:bg-gray-400">
            ✉️ Share room
          </button>
        </div>

        <div className="flex">
          <button onClick={enterJamRoom}  className="h-12 px-6 m-2 text-lg text-black transition-colors duration-150 bg-gray-300 rounded-lg focus:shadow-outline hover:bg-gray-400 flex-grow mt-10">
            🔊 Open microphone and join audio
          </button>
        </div>
      </div>
    </div>
  );
}
