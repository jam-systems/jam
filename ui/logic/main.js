import swarm from '../lib/swarm';
import state, {actions} from './state';
import {get} from './backend';
import identity, {signData, verifyData} from './identity';
import {DEV, config} from './config';
import {requestAudio, stopAudio} from './audio';
import './reactions';
import './room';
import {is, on} from 'use-minimal-state';

if (DEV) {
  window.state = state; // for debugging
  window.swarm = swarm;
}
export {state};

function configSignalhub() {
  swarm.config({
    debug: config.development,
    url: config.urls.signalHub + '/',
    sign: signData,
    verify: verifyData,
    pcConfig: {
      iceTransportPolicy: 'all',
      iceServers: [
        {urls: `stun:stun.jam.systems:3478`},
        {urls: `${config.urls.stun}`},
        {
          ...config.urls.turnCredentials,
          urls: `${config.urls.turn}`,
        },
      ],
    },
  });
}
configSignalhub();
on(config, () => configSignalhub());

export function enterRoom(roomId) {
  state.set('userInteracted', true);
  state.set('inRoom', roomId);
  swarm.set('sharedState', state => ({...state, inRoom: true}));
  if (state.iAmSpeaker) {
    requestAudio().then(() => is(state, 'soundMuted', false));
  } else {
    is(state, 'soundMuted', false);
  }
}
on(actions.ENTER, roomId => enterRoom(roomId));

export function leaveRoom() {
  state.set('inRoom', null);
  swarm.set('sharedState', state => ({...state, inRoom: false}));
  stopAudio();
  state.set('soundMuted', true);
}

// leave room when it gets closed
on(state, 'room', room => {
  let {moderators, closed} = room;
  if (state.inRoom && closed && !moderators.includes(identity.publicKey)) {
    leaveRoom();
  }
});

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
