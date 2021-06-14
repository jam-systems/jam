import {is, use} from 'use-minimal-state';
import React, {useEffect, useState} from 'react';
import {CloseSvg, ShowModal} from './Modal';
import {declare, useRootState} from '../lib/state-tree';
import {useJamState} from '../jam-core-react';

export function ShowAudioPlayerToast() {
  let audioFileElement = useRootState('audioFileElement');
  declare(ShowModal, {
    component: AudioPlayerToast,
    show: !!audioFileElement,
  });
}

function AudioPlayerToast({close}) {
  const state = useJamState();
  let {name} = use(state, 'audioFile') ?? {};
  let audio = use(state, 'audioFileElement');
  let [element, setElement] = useState();
  useEffect(() => {
    if (element && audio) {
      audio.controls = true;
      audio.style.width = '100%';
      element.appendChild(audio);
      return () => {
        element.removeChild(audio);
      };
    }
  }, [element, audio, close]);

  function end() {
    is(state, 'audioFile', null);
    close();
  }

  return (
    <div
      className="mt-40 w-96"
      style={{
        position: 'absolute',
        zIndex: '10',
        top: '24px',
        left: '50%',
      }}
    >
      <div
        className="bg-gray-500 rounded-lg p-6"
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
            <div className="text-white font-semibold pb-6">
              {/*  heroicons/music-note */}
              <svg
                className="w-5 h-5 inline mr-2 -mt-1"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
              You are streaming to the room
            </div>
          </div>
          <div onClick={end} style={{cursor: 'pointer'}}>
            <CloseSvg color="white" />
          </div>
        </div>
        <div className="mb-3 text-gray-200 text-center">{name ?? ''}</div>
      </div>
    </div>
  );
}
