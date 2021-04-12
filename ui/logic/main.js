import swarm from '../lib/swarm';
import state, {actions} from './state';
import {get} from './backend';
import {currentId, signData, verifyData} from './identity';
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
    reduceState: (states, current, latest) => {
      if (latest.inRoom) return latest;
      // if latest is not inRoom, we probably want to ignore most props from it
      // if not, add them here
      return {...current, inRoom: states.some(s => s.inRoom)};
    },
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
  if (state.inRoom && closed && !moderators.includes(currentId())) {
    leaveRoom();
  }
});
// leave room when same peer joins it from elsewhere and I'm in room
on(swarm.connectionState, identity.publicKey, myConnState => {
  if (myConnState === undefined) {
    is(state, {otherDeviceInRoom: false});
    return;
  }
  let {states, latest} = myConnState;
  let {myConnId} = swarm;
  let otherDeviceInRoom = false;
  for (let connId in states) {
    if (connId !== myConnId && states[connId].state.inRoom) {
      otherDeviceInRoom = true;
      if (connId === latest && state.inRoom) leaveRoom();
      break;
    }
  }
  is(state, {otherDeviceInRoom});
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
