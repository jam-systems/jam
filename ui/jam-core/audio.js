import {declare, use, useRootState, useOn, useAction} from '../lib/state-tree';
import Microphone from './audio/Microphone';
import AudioFile from './audio/AudioFile';
import PlayingAudio from './audio/PlayingAudio';
import VolumeMeter from './audio/VolumeMeter';
import {is} from 'minimal-state';
import {actions} from './state';
const AudioContext = window.AudioContext || window.webkitAudioContext;

// TODO: could we use AudioContext.onstatechange to detect cases where the the ability to play audio is lost?

export {AudioState};

function AudioState({swarm}) {
  const state = useRootState();
  const audioElements = {}; // {peerId: HTMLAudioElement}
  let audioContext = null;
  let audioContextStarted = false;

  // not clear whether this improves anything for Safari, could try to remove
  // creates lots of unnecessary audio elements in rooms with large audience
  useOn(swarm, 'newPeer', peerId => {
    if (!audioElements[peerId]) {
      audioElements[peerId] = new Audio();
      audioElements[peerId].muted = state.soundMuted;
    }
  });

  return function AudioState({
    myId,
    inRoom,
    iAmSpeaker,
    userInteracted,
    micMuted,
    remoteStreams,
    customStream,
  }) {
    let [handRaised, audioFile] = useRootState(['handRaised', 'audioFile']);

    if (audioContext === null && AudioContext) {
      let shouldHaveAudioContext =
        userInteracted || (inRoom && (iAmSpeaker || remoteStreams.length > 0));
      if (shouldHaveAudioContext) {
        audioContext = new AudioContext();
        let now = Date.now();
        let onAudioContextState = () => {
          if (audioContext.state === 'running') {
            audioContextStarted = true;
            console.warn('audioContext started after', Date.now() - now);
          }
        };
        audioContext.addEventListener('statechange', onAudioContextState);
        setTimeout(() => {
          audioContext.removeEventListener('statechange', onAudioContextState);
          if (audioContext.state === 'running') {
            audioContextStarted = true;
          }
          if (!audioContextStarted) {
            is(state, 'audioPlayError', true);
          }
        }, 1000);
      }
    }
    let [isRetrySound] = useAction(actions.RETRY_AUDIO);
    if (isRetrySound && audioContext && !audioContextStarted) {
      audioContext.resume();
    }

    let shouldHaveMic = !!(inRoom && (iAmSpeaker || handRaised));
    let {micStream, hasRequestedOnce} = use(Microphone, {shouldHaveMic});
    let {audioFileStream, audioFileElement} = use(AudioFile, {
      audioFile,
      audioContext,
    });

    let myAudio = customStream ?? audioFileStream ?? micStream;
    declare(Muted, {myAudio, micMuted});

    if (iAmSpeaker) {
      declare(VolumeMeter, {peerId: myId, stream: myAudio, audioContext});
    }

    let soundMuted = !inRoom || (iAmSpeaker && !hasRequestedOnce);

    remoteStreams.map(({peerId, stream}) =>
      declare(PlayingAudio, {
        key: peerId,
        peerId,
        audioContext,
        audioElements,
        stream,
        soundMuted,
        shouldPlay: !!inRoom,
      })
    );

    return {myAudio, soundMuted, audioFileElement};
  };
}

function Muted({myAudio, micMuted}) {
  if (myAudio) {
    for (let track of myAudio.getTracks()) {
      if (track.enabled !== !micMuted) {
        track.enabled = !micMuted;
      }
    }
  }
}
