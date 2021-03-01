import swarm from './lib/swarm.js';
import hark from 'hark';
import {forwardApiQuery, get, updateApiQuery} from './backend';
import {signData, verifyData} from './identity';
import state from './state.js';
import {once} from 'use-minimal-state';
import {DEV, jamHost} from './config';

window.state = state; // for debugging
window.swarm = swarm;

export {state};

swarm.config({
  debug: DEV,
  sign: signData,
  verify: verifyData,
  pcConfig: {
    iceTransportPolicy: 'all',
    iceServers: [
      {urls: `stun:stun.jam.systems:3478`},
      {urls: `stun:stun.${jamHost()}:3478`},
      {
        urls: `turn:turn.${jamHost()}:3478`,
        username: 'test',
        credential: 'yieChoi0PeoKo8ni',
      },
    ],
  },
});
state.on('userInteracted', i => i && createAudioContext());

export {requestAudio};

export function enterRoom() {
  state.set('userInteracted', true);
  swarm.set('sharedState', state => ({...state, inRoom: true}));
  requestAudio().then(() => state.set('soundMuted', false));
}

export function leaveRoom() {
  swarm.set('sharedState', state => ({...state, inRoom: false}));
  stopAudio();
  state.set('soundMuted', true);
}

export function connectRoom(roomId) {
  if (swarm.connected) swarm.disconnect();
  swarm.connect(`https://${jamHost()}/_/signalhub/`, roomId);
  swarm.hub.subscribe('identity-updates', async ({peerId}) => {
    state.set('identities', {
      ...state.identities,
      [peerId]: await get(`/identities/${peerId}`),
    });
  });
  swarm.hub.subscribeAnonymous('room-info', data => {
    console.log('new room info', data);
    updateApiQuery(`/rooms/${swarm.room}`, data, 200);
  });
  forwardApiQuery(`/rooms/${roomId}`, 'room');
}
const emptyRoom = {name: '', description: '', speakers: [], moderators: []};
function currentRoom() {
  return state.room || emptyRoom;
}

state.on('room', (room = emptyRoom, oldRoom = emptyRoom) => {
  let {speakers: oldSpeakers} = oldRoom;
  let {speakers} = room;

  // detect when I become speaker & send audio stream
  let {myPeerId} = swarm;
  if (!oldSpeakers.includes(myPeerId) && speakers.includes(myPeerId)) {
    let {myAudio} = state;
    if (myAudio) {
      connectVolumeMeter('me', myAudio);
      swarm.addLocalStream(myAudio, 'audio', myAudio =>
        state.set('myAudio', myAudio)
      );
    }
  }
  // or stop sending stream when I become audience member
  if (oldSpeakers.includes(myPeerId) && !speakers.includes(myPeerId)) {
    disconnectVolumeMeter('me');
    swarm.addLocalStream(null, 'audio');
  }
});

export function sendReaction(reaction) {
  swarm.emit('sharedEvent', {reaction});
  showReaction(reaction, swarm.myPeerId);
}
swarm.on('peerEvent', (peerId, data) => {
  if (peerId === swarm.myPeerId) return;
  let {reaction} = data;
  if (reaction) showReaction(reaction, peerId);
});
function showReaction(reaction, peerId) {
  let {reactions} = state;
  if (!reactions[peerId]) reactions[peerId] = [];
  let reactionObj = [reaction, Math.random()];
  reactions[peerId].push(reactionObj);
  state.update('reactions');
  setTimeout(() => {
    let i = reactions[peerId].indexOf(reactionObj);
    if (i !== -1) reactions[peerId].splice(i, 1);
    state.update('reactions');
  }, 5000);
}

export function createAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext && !state.audioContext) {
    state.set('audioContext', new AudioContext());
  } //  else {
  //   state.audioContext.resume();
  // }
}

state.on('myAudio', myAudio => {
  // if i am speaker, send audio to peers
  let {speakers} = currentRoom();
  if (speakers.includes(swarm.myPeerId)) {
    connectVolumeMeter('me', myAudio);
    swarm.addLocalStream(myAudio, 'audio', myAudio =>
      state.set('myAudio', myAudio)
    );
  }
});

let speaker = {};
state.on('soundMuted', muted => {
  for (let id in speaker) {
    speaker[id].muted = muted;
  }
});

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
  let audio = new Audio();
  speaker[id] = audio;
  audio.srcObject = stream;
  audio.muted = state.soundMuted;
  audio.addEventListener('canplay', () => {
    play(audio).catch(() => {
      // console.log('deferring audio.play');
      state.set('soundMuted', true);
      state.on('userInteracted', interacted => {
        if (interacted)
          play(audio).then(() => {
            if (state.soundMuted) state.set('soundMuted', false);
            // console.log('playing audio!!');
          });
      });
    });
  });
  connectVolumeMeter(id, stream);
});

// TODO: this did not fix iOS speaker consistency
async function play(audio) {
  await audio.play();
  // audio.pause();
  // await audio.play();
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
  return stream;
}

async function stopAudio() {
  if (state.myAudio) {
    state.myAudio.getTracks().forEach(track => track.stop());
  }
  state.set('myAudio', undefined);
}

state.on('micMuted', micMuted => {
  let {myAudio} = state;
  if (!myAudio?.active && !micMuted) {
    requestAudio();
    return;
  }
  if (myAudio) {
    for (let track of myAudio.getTracks()) {
      track.enabled = !micMuted;
    }
  }
  swarm.set('sharedState', state => ({...state, micMuted}));
});

let volumeMeters = {};
function connectVolumeMeter(peerId, stream) {
  if (!stream) {
    disconnectVolumeMeter(peerId);
    return;
  }
  if (!state.audioContext) {
    // if no audio context exists yet, retry as soon as it is available
    once(state, 'audioContext', () => connectVolumeMeter(peerId, stream));
    return;
  }
  let options = {audioContext: state.audioContext};
  let volumeMeter = hark(stream, options);

  volumeMeter.on('speaking', () => {
    state.speaking.add(peerId);
    state.update('speaking');
  });

  volumeMeter.on('stopped_speaking', () => {
    state.speaking.delete(peerId);
    state.update('speaking');
  });

  disconnectVolumeMeter(peerId);
  volumeMeters[peerId] = volumeMeter;
}

function disconnectVolumeMeter(peerId) {
  let volumeMeter = volumeMeters[peerId];
  if (volumeMeter) volumeMeter.stop();
  volumeMeters[peerId] = null;
}
