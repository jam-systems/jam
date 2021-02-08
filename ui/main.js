import swarm from './lib/swarm.js';
import State from './lib/minimal-state.js';
import hark from 'hark';
import {onFirstInteraction} from './lib/user-interaction.js';
import {get} from './backend';
import {getId, updateInfo, signedToken} from './lib/identity';
// import {updateStorage} from './lib/local-storage.js';

export const state = State({
  myInfo: {},
  soundMuted: true,
  micMuted: true,
  myAudio: null,
  speaking: new Set(),
  enteredRooms: new Set(),
  queries: {},
  audioContext: null,
  userInteracted: false,
  identities: {},
});
window.state = state; // for debugging
window.swarm = swarm;

state.on('myInfo', updateInfo);

onFirstInteraction(() => state.set('userInteracted', true));
state.on('userInteracted', i => i && createAudioContext());

export {requestAudio};

export function enterRoom(roomId) {
  state.enteredRooms.add(roomId);
  state.update('enteredRooms');
  requestAudio();
  state.set('soundMuted', false);
  // createAudioContext();
  // updateStorage(sessionStorage, 'enteredRooms', (rooms = []) => {
  //   if (rooms.indexOf(roomId) === -1) rooms.push(roomId);
  //   return rooms;
  // });
}

export function createAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext && !state.audioContext) {
    state.set('audioContext', new AudioContext());
  } else {
    state.audioContext.resume();
  }
}

export function leaveRoom(roomId) {
  state.enteredRooms.delete(roomId);
  state.update('enteredRooms');
  stopAudio();
  state.set('soundMuted', true);
  // updateStorage(sessionStorage, 'enteredRooms', (rooms = []) => {
  //   let i = rooms.indexOf(roomId);
  //   if (i !== -1) rooms.splice(i, 1);
  //   return rooms;
  // });
}

export function connectRoom(roomId) {
  swarm.config('https://signalhub.jam.systems/', roomId);
  if (swarm.connected) swarm.disconnect();
  swarm.connect();
  swarm.hub.subscribe('identity-updates', async id => {
    state.set('identities', {
      ...state.get('identities'),
      [id]: await get(`/identities/${id}`),
    });
  });
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

swarm.on('newPeer', async id => {
  state.identities[id] = await get(`/identities/${id}`);
  state.update('identities');
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
    audio.play().catch(() => {
      console.log('deferring audio.play');
      state.set('soundMuted', true);
      state.on('userInteracted', interacted => {
        if (interacted)
          audio.play().then(() => {
            state.set('soundMuted', false);
            console.log('playing audio!!');
          });
      });
    });
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

state.on('micMuted', micMuted => {
  if (!state.myAudio?.active && !micMuted) {
    requestAudio();
    return;
  }
  for (let track of state.myAudio.getTracks()) {
    track.enabled = !micMuted;
  }
  swarm.hub.broadcast('mute-status', {
    id: getId(),
    micMuted,
    authToken: signedToken(),
  });
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
