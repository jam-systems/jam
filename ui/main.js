import swarm from './lib/swarm.js';
import hark from 'hark';
import {onFirstInteraction} from './lib/user-interaction.js';
import {get} from './backend';
import {updateInfo} from './identity';
import state from './state.js';

window.state = state; // for debugging
window.swarm = swarm;

export {state};

state.on('myInfo', updateInfo);

onFirstInteraction(() => state.set('userInteracted', true));
state.on('userInteracted', i => i && createAudioContext());

export {requestAudio};

export function enterRoom(roomId) {
  state.enteredRooms.add(roomId);
  state.update('enteredRooms');
  swarm.set('sharedState', state => ({...state, inRoom: true}));
  requestAudio();
  state.set('soundMuted', false);
}

export function leaveRoom(roomId) {
  state.enteredRooms.delete(roomId);
  state.update('enteredRooms');
  swarm.set('sharedState', state => ({...state, inRoom: false}));
  stopAudio();
  state.set('soundMuted', true);
}

swarm.on('peerState', state => console.log('shared peer state', state));

export function connectRoom(roomId) {
  if (swarm.connected) swarm.disconnect();
  swarm.connect('https://signalhub.jam.systems/', roomId);
  swarm.hub.subscribe('identity-updates', async id => {
    state.set('identities', {
      ...state.get('identities'),
      [id]: await get(`/identities/${id}`),
    });
  });
}

export function createAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext && !state.audioContext) {
    state.set('audioContext', new AudioContext());
  } else {
    state.audioContext.resume();
  }
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
  swarm.set('sharedState', state => ({...state, micMuted}));
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
