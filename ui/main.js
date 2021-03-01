import swarm from './lib/swarm.js';
import {forwardApiQuery, get, updateApiQuery} from './backend';
import {signData, verifyData} from './identity';
import state, {emptyRoom} from './state.js';
import {DEV, jamHost} from './config';
import {
  requestAudio,
  stopAudio,
  connectVolumeMeter,
  disconnectVolumeMeter,
} from './audio.js';

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
