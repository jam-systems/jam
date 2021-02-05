import swarm from './lib/swarm.js';
import State from './lib/minimal-state.js';
import hark from 'hark';

export const state = State({
  soundMuted: true,
  myAudio: null,
  speaking: new Set(),
  enteredRooms: new Set(),
  queries: {},
});
window.state = state; // for debugging

export {requestAudio};

export function enterRoom(roomId) {
  state.enteredRooms.add(roomId);
  state.update('enteredRooms');
  state.set('soundMuted', false);
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

state.on('myAudio', () => {
  swarm.addLocalStream(state.myAudio, 'audio');
});

let speaker = {};
state.on('soundMuted', () => {
  let muted = state.soundMuted;
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
  audio.muted = state.soundMuted;
  audio.addEventListener('canplay', () => {
    audio.play();
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
    });
  if (!stream) return;
  state.set('myAudio', stream);
  listenIfSpeaking('me', stream);
  return stream;
}

async function stopAudio() {
  if (state.myAudio) {
    state.myAudio.getTracks().forEach(track => track.stop());
  }
  state.set('myAudio', undefined);
}

function listenIfSpeaking(peerId, stream) {
  let options = {};
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
