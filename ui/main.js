import swarm from './lib/swarm.js';
import State from './lib/minimal-state.js';
import hark from 'hark';
import {onFirstInteraction} from './lib/user-interaction.js';

export const state = State({
  soundMuted: true,
  micMuted: true,
  myAudio: null,
  speaking: new Set(),
  enteredRooms: new Set(),
  queries: {},
  audioContext: null,
  userInteracted: false,
});
window.state = state; // for debugging

onFirstInteraction(() => state.set('userInteracted', true));

export {requestAudio};

export function enterRoom(roomId) {
  state.enteredRooms.add(roomId);
  state.update('enteredRooms');
  requestAudio(); // TBD
  state.set('soundMuted', false);
  createAudioContext();
}

function createAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext && !state.audioContext) {
    state.set('audioContext', new AudioContext());
  }
}

export function leaveRoom(roomId) {
  state.enteredRooms.delete(roomId);
  state.update('enteredRooms');
  stopAudio();
  state.set('soundMuted', true);
}

export function connectRoom(roomId) {
  swarm.config('https://signalhub.jam.systems/', roomId);
  if (swarm.connected) swarm.disconnect();
  swarm.connect();
}

state.on('myAudio', stream => {
  swarm.addLocalStream(stream, 'audio');
});

let speaker = {};
state.on('soundMuted', muted => {
  for (let id in speaker) {
    speaker[id].muted = muted;
  }
});

swarm.on('stream', (stream, name, peer) => {
  console.log('remote stream', name, stream);
  let id = peer.peerId;
  if (!stream) {
    delete speaker[id];
    return;
  }
  let audio = new Audio();
  speaker[id] = audio;
  audio.srcObject = stream;
  console.log('muted', state.soundMuted);
  audio.muted = state.soundMuted;
  audio.addEventListener('canplay', () => {
    try {
      audio.play(); // throws in chrome before user interaction
    } catch (e) {
      state.on('userInteracted', interacted => {
        if (interacted) audio.play();
      });
    }
  });
  listenIfSpeaking(id, stream);
});

async function requestAudio() {
  if (state.myAudio && state.myAudio.active) {
    return state.myAudio;
  }
  let stream = await navigator.mediaDevices
    .getUserMedia({
      video: false,
      audio: true,
    })
    .catch(err => {
      console.error('error getting mic');
      console.error(err);
      state.set('micMuted', true);
    });
  if (!stream) return;
  state.set('myAudio', stream);
  state.set('micMuted', false);
  listenIfSpeaking('me', stream);
  return stream;
}

async function stopAudio() {
  if (state.myAudio) {
    state.myAudio.getTracks().forEach(track => track.stop());
  }
  state.set('myAudio', undefined);
}

state.on('micMuted', muted => {
  if (!state.myAudio?.active && !muted) {
    requestAudio();
    return;
  }
  for (let track of state.myAudio.getTracks()) {
    track.enabled = !muted;
  }
});

function listenIfSpeaking(peerId, stream) {
  if (!state.audioContext) {
    // if no audio context exists yet, retry as soon as it is available
    let onAudioContext = () => {
      console.log('reacting to audio context later');
      listenIfSpeaking(peerId, stream);
      state.off('audioContext', onAudioContext);
    };
    state.on('audioContext', onAudioContext);
    return;
  }
  console.log('have an audio context');
  let options = {audioContext: state.audioContext};
  let speechEvents = hark(stream, options);

  speechEvents.on('speaking', () => {
    state.speaking.add(peerId);
    state.update('speaking');
  });

  speechEvents.on('stopped_speaking', () => {
    state.speaking.delete(peerId);
    state.update('speaking');
  });
}
