import swarm from './lib/swarm.js';
import hark from 'hark';
import {onFirstInteraction} from './lib/user-interaction.js';
import {get} from './backend';
import {updateInfo} from './identity';
import state from './state.js';
import {jamHost} from "./config";

window.state = state; // for debugging
window.swarm = swarm;

export {state};

state.on('myInfo', updateInfo);

// TODO remove when convinced it works
swarm.on('peerState', state => console.log('shared peer state', state));

onFirstInteraction(() => console.log('first user interaction'));
state.on('userInteracted', i => i && createAudioContext());

export {requestAudio};

export function enterRoom(roomId) {
  state.set('userInteracted', true);
  state.enteredRooms.add(roomId);
  state.update('enteredRooms');
  swarm.set('sharedState', state => ({...state, inRoom: true}));
  requestAudio().then(() => state.set('soundMuted', false));
}

export function leaveRoom(roomId) {
  state.enteredRooms.delete(roomId);
  state.update('enteredRooms');
  swarm.set('sharedState', state => ({...state, inRoom: false}));
  stopAudio();
  state.set('soundMuted', true);
}

export function connectRoom(roomId) {
  if (swarm.connected) swarm.disconnect();
  swarm.connect(`https://signalhub.${jamHost()}/`, roomId);
  swarm.hub.subscribe('identity-updates', async id => {
    state.set('identities', {
      ...state.get('identities'),
      [id]: await get(`/identities/${id}`),
    });
  });
  swarm.hub.subscribe('room-info', data => {
    console.log('ROOM INFO', data);
    // TODO updateApiQuery when PUT /room is actually used
  });
}
const emptyRoom = {name: '', description: '', speakers: [], moderators: []};
function currentRoom() {
  return state.queries[`/rooms/${swarm.room}`]?.data || emptyRoom;
}
state.on('queries', () => {
  let {speakers} = currentRoom();
  if (!state.soundMuted)
    speakers.forEach(id => {
      if (speaker[id]?.muted) speaker[id].muted = false;
    });
});

export function createAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext && !state.audioContext) {
    state.set('audioContext', new AudioContext());
  } //  else {
  //   state.audioContext.resume();
  // }
}

state.on('myAudio', stream => {
  swarm.addLocalStream(stream, 'audio');
});

let speaker = {};
state.on('soundMuted', muted => {
  let {speakers} = currentRoom();
  for (let id in speaker) {
    speaker[id].muted = muted || !speakers.includes(id);
  }
});
// TODO make muted also react to changing speakers !!

swarm.on('newPeer', async id => {
  for (let i = 0; i < 5; i++) {
    // try multiple times to lose race with the first POST /identities
    try {
      state.identities[id] = await get(`/identities/${id}`);
      state.update('identities');
      return;
    } catch (e) {
      console.warn(e);
    }
  }
});

swarm.on('stream', (stream, name, peer) => {
  console.log('remote stream', name, stream);
  let id = peer.peerId;
  if (!stream) {
    delete speaker[id];
    return;
  }
  let {speakers} = currentRoom();
  let audio = new Audio();
  speaker[id] = audio;
  audio.srcObject = stream;
  audio.muted = state.soundMuted || !speakers.includes(id);
  audio.addEventListener('canplay', () => {
    play(audio).catch(() => {
      console.log('deferring audio.play');
      state.set('soundMuted', true);
      state.on('userInteracted', interacted => {
        if (interacted)
          play(audio).then(() => {
            if (state.soundMuted) state.set('soundMuted', false);
            console.log('playing audio!!');
          });
      });
    });
  });
  // these don't seem to be useful
  // audio.addEventListener('suspend', () => console.log('EVENT: suspend', id));
  // audio.addEventListener('stalled', () => console.log('EVENT: stalled', id));
  // audio.addEventListener('waiting', () => console.log('EVENT: waiting', id));
  // audio.addEventListener('volumechange', () =>
  //   console.log('EVENT: volumechange', id)
  // );

  listenIfSpeaking(id, stream);
});

// TODO: does this fix iOS speaker consistency?
// TODO: worth it to detect OS?
async function play(audio) {
  await audio.play();
  audio.pause();
  await audio.play();
}

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
