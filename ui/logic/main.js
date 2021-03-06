import swarm from '../lib/swarm';
import state from './state';
import {get} from './backend';
import {signData, verifyData} from './identity';
import {DEV, config} from './config';
import {requestAudio, stopAudio, requestMicPermissionOnly} from './audio';
import './reactions';
import './room';

if (DEV) {
  window.state = state; // for debugging
  window.swarm = swarm;
}
export {state};

swarm.config({
  debug: DEV,
  url: config.signalHubUrl + '/',
  sign: signData,
  verify: verifyData,
  pcConfig: {
    iceTransportPolicy: 'all',
    iceServers: [
      {urls: `stun:stun.jam.systems:3478`},
      {urls: `stun:${config.stunServer}`},
      {
        urls: `turn:${config.turnServer}`,
        username: 'test',
        credential: 'yieChoi0PeoKo8ni',
      },
    ],
  },
});

export function enterRoom(roomId) {
  state.set('userInteracted', true);
  state.set('inRoom', roomId);
  swarm.set('sharedState', state => ({...state, inRoom: true}));
  requestAudio().then(() => state.set('soundMuted', false));
  // if (state.iAmSpeaker) {
  //   requestAudio().then(() => state.set('soundMuted', false));
  // } else {
  //   requestMicPermissionOnly().then(() => state.set('soundMuted', false));
  // }
}

export function leaveRoom() {
  state.set('inRoom', null);
  swarm.set('sharedState', state => ({...state, inRoom: false}));
  stopAudio();
  state.set('soundMuted', true);
}

swarm.on('newPeer', async id => {
  for (let i = 0; i < 5; i++) {
    // try multiple times to lose race with the first POST /identities
    let [data, ok] = await get(`/identities/${id}`);
    if (ok) {
      state.identities[id] = data;
      state.update('identities');
      return;
    }
  }
});
