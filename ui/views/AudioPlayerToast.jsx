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
      style={{
        position: 'absolute',
        zIndex: '10',
        top: '24px',
        left: '50%',
      }}
    >
      <div
        ref={el => setElement(el)}
        style={{
          position: 'relative',
          left: '-50%',
          padding: '1rem',
          backgroundColor: 'black',
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
          <div>{name || ''}</div>
          <div onClick={end} style={{cursor: 'pointer'}}>
            <CloseSvg color="white" />
          </div>
        </div>
      </div>
    </div>
  );
}
