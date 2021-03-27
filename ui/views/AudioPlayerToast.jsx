import {set} from 'minimal-state';
import React, {useEffect, useState} from 'react';
import state from '../logic/state';
import {domEvent} from '../logic/util';
import {CloseSvg} from './Modal';

export default function AudioPlayerToast({close, audio, name}) {
  let [element, setElement] = useState();
  useEffect(() => {
    if (element && audio) {
      audio.controls = true;
      audio.style.width = '100%';
      element.appendChild(audio);
      domEvent(audio, 'ended').then(close);
    }
  }, [element, audio, close]);

  let end = () => {
    audio.src = null;
    if (state.myMic) set(state, 'myAudio', state.myMic);
    close();
  };
  return (
    <div
      class="mt-40 w-80"
      style={{
        position: 'absolute',
        zIndex: '10',
        top: '24px',
        left: '50%',
      }}
    >
      <div
        class="bg-gray-500 rounded-lg p-6"
        ref={el => setElement(el)}
        style={{
          position: 'relative',
          left: '-50%',
          color: 'white',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '4px',
          }}
        >
          <div>
            <div class="text-white font-semibold pb-6">
              {/*  heroicons/music-note */}
              <svg
                className="w-5 h-5 inline mr-2 -mt-1"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              You are streaming to the room
            </div>


          </div>
          <div onClick={end} style={{cursor: 'pointer'}}>
            <CloseSvg color="white" />
          </div>
        </div>
        <div class="mb-3 text-gray-200 text-center">
          {name || ''}
        </div>
      </div>
    </div>
  );
}
