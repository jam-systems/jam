import swarm from '../lib/swarm';
import state from './state';
import {get} from './backend';
import {signData, verifyData} from './identity';
import {DEV, config} from './config';
import {requestAudio, stopAudio} from './audio';
import './reactions';
import './room';

window.state = state; // for debugging
window.swarm = swarm;

export {state};

swarm.config({
  debug: DEV,
  url: config.signalHubUrl +'/',
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
