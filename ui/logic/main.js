import swarm from '../lib/swarm';
import state from './state';
import {get} from './backend';
import {signData, verifyData} from './identity';
import {DEV, jamHost} from './config';
import {
  requestAudio,
  stopAudio,
  connectVolumeMeter,
  disconnectVolumeMeter,
} from './audio';
import './reactions';
import './room';

window.state = state; // for debugging
window.swarm = swarm;

export {state};

swarm.config({
  debug: DEV,
  url: `https://${jamHost()}/_/signalhub/`,
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

state.on('iAmSpeaker', iAmSpeaker => {
  if (iAmSpeaker) {
    // send audio stream when I become speaker
    let {myAudio} = state;
    if (myAudio) {
      connectVolumeMeter('me', myAudio);
      swarm.addLocalStream(myAudio, 'audio', myAudio =>
        state.set('myAudio', myAudio)
      );
    }
  } else {
    // stop sending stream when I become audience member
    disconnectVolumeMeter('me');
    swarm.addLocalStream(null, 'audio');
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
