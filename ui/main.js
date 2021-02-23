import swarm from './lib/swarm.js';
import hark from 'hark';
import {get, updateApiQuery} from './backend';
import {signData, updateInfo, verifyData} from './identity';
import state from './state.js';
import {jamHost} from './config';

window.state = state; // for debugging
window.swarm = swarm;

export {state};

state.on('myInfo', updateInfo);

swarm.config({
  sign: signData,
  verify: verifyData,
  pcConfig: {
    iceTransportPolicy: 'all',
    iceServers: [
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
  swarm.connect(`https://signalhub.${jamHost()}/`, roomId);
  swarm.hub.subscribe('identity-updates', async id => {
    state.set('identities', {
      ...state.get('identities'),
      [id]: await get(`/identities/${id}`),
    });
  });
  swarm.hub.subscribe('room-info', data => {
    console.log('new room info', data);
    updateApiQuery(`/rooms/${swarm.room}`, data, 200);
  });
}
const emptyRoom = {name: '', description: '', speakers: [], moderators: []};
function currentRoom() {
  return state.queries[`/rooms/${swarm.room}`]?.data || emptyRoom;
}
state.on('queries', () => {
  let {speakers} = currentRoom();
  if (!state.soundMuted) {
    speakers.forEach(id => {
      if (speaker[id]?.muted) speaker[id].muted = false;
    });
    for (let id in speaker) {
      if (!speakers.includes(id)) speaker[id].muted = true;
    }
  }
});

export function sendReaction(reaction) {
  swarm.emit('sharedEvent', {reaction});
  showReaction(reaction, swarm.myPeerId);
}
swarm.on('peerEvent', (peerId, data) => {
  if (peerId === swarm.myPeerId) return;
  let {reaction} = data;
  showReaction(reaction, peerId);
});
function showReaction(reaction, peerId) {
  let {reactions} = state;
  if (reaction) {
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
}

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
  // these don't seem to be useful
  // audio.addEventListener('suspend', () => console.log('EVENT: suspend', id));
  // audio.addEventListener('stalled', () => console.log('EVENT: stalled', id));
  // audio.addEventListener('waiting', () => console.log('EVENT: waiting', id));
  // audio.addEventListener('volumechange', () =>
  //   console.log('EVENT: volumechange', id)
  // );

  listenIfSpeaking(id, stream);
});

// TODO: this does not fix iOS speaker consistency
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

function listenIfSpeaking(peerId, stream) {
  if (!state.audioContext) {
    // if no audio context exists yet, retry as soon as it is available
    let onAudioContext = () => {
      listenIfSpeaking(peerId, stream);
      state.off('audioContext', onAudioContext);
    };
    state.on('audioContext', onAudioContext);
    return;
  }
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
