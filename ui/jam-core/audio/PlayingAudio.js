import {is} from 'use-minimal-state';
import log from '../../lib/causal-log';
import {domEvent} from '../../lib/util';
import {useDidChange} from '../../lib/state-utils';
import {declare, useRootState, useAction} from '../../lib/state-tree';
import {userAgent} from '../../lib/user-agent';
import VolumeMeter from './VolumeMeter';

export default function PlayingAudio({audioElements, peerId, soundMuted}) {
  const state = useRootState();
  let activeStream = null;
  let clonedStream = null;

  let audio = audioElements[peerId];
  if (!audio) {
    audio = new Audio();
    audioElements[peerId] = audio;
    audio.muted = soundMuted;
  }

  return function PlayingAudio({stream, audioContext, soundMuted, shouldPlay}) {
    let shouldStartPlaying = false;

    if (activeStream !== stream && stream) {
      activeStream = stream;
      clonedStream = stream.clone();

      audio.removeAttribute('srcObject');
      audio.load(); // this can cause a previous play() to reject
      audio.srcObject = stream;

      if (shouldPlay) {
        shouldStartPlaying = true;
      }
    }

    if (useDidChange(soundMuted)) {
      audio.muted = soundMuted;
      if (!soundMuted && audio.paused) {
        shouldStartPlaying = true;
      }
    }

    if (shouldStartPlaying) {
      play(audio).catch(err => {
        if (stream === activeStream) {
          console.warn(err);
          if (shouldPlay) is(state, 'audioPlayError', true);
        } else {
          // call to play() was for a an older stream, error caused by racing new stream
          // => all good, don't set error!
        }
      });
    }

    let [isRetrySound] = useAction('retry-audio-play');
    if (isRetrySound) {
      if (audio.paused) play(audio).catch(console.warn);
    }

    declare(VolumeMeter, {
      peerId,
      stream: clonedStream,
      audioContext,
    });
  };
}

function play(audio) {
  // we make sure that audio.play() is called synchronously so the browser has an easier time
  // seeing that the first play was caused by user interaction
  log('playing audio on engine', userAgent.engine.name);
  if (userAgent.engine.name === 'WebKit') {
    // HACK for Safari audio output bug
    return audio
      .play()
      .then(() => {
        let onpause = domEvent(audio, 'pause');
        audio.pause();
        return onpause;
      })
      .then(() => audio.play());
  } else {
    return audio.play();
  }
}
