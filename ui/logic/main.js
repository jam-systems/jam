import state, {swarm} from './state';
import {get} from './backend';
import {currentId, signData, verifyData} from './identity';
import {staticConfig} from './config';
import {requestAudio, stopAudio} from './audio';
import './reactions';
import './room';
import {is, on, set, update} from 'use-minimal-state';
import {S, declareStateRoot, useMemo, useState} from '../lib/state-tree';

declareStateRoot(Root, state);

function Root({room, inRoom, iAmSpeaker, iAmModerator}) {
  let {closed} = room;

  if (closed && !iAmModerator) {
    inRoom = false;
  }

  let {userInteracted, soundMuted} = S(EnterRoom, {inRoom, iAmSpeaker, swarm});

  return {userInteracted, soundMuted, inRoom};
}

function EnterRoom({inRoom, iAmSpeaker, swarm}) {
  is(swarm.myPeerState, 'inRoom', !!inRoom);

  let [hasRequested, setRequested] = useState(false);
  let userInteracted = useMemo(i => i || !!inRoom, [inRoom]);

  if (!inRoom) stopAudio();
  if (inRoom && iAmSpeaker)
    requestAudio().then(() => {
      setRequested(true);
      setRequested(true);
    });

  return {
    userInteracted,
    soundMuted: inRoom ? iAmSpeaker && !hasRequested : true,
  };
}

export function enterRoom(roomId) {
  set(state, 'inRoom', roomId);
}

export function leaveRoom() {
  set(state, 'inRoom', null);
}

function configSwarm() {
  swarm.config({
    debug: staticConfig.development,
    url: staticConfig.urls.pantry,
    sign: signData,
    verify: verifyData,
    reduceState: (_states, _current, latest, findLatest) => {
      if (latest.inRoom) return latest;
      return findLatest(s => s.inRoom) ?? latest;
    },
    pcConfig: {
      iceTransportPolicy: 'all',
      iceServers: [
        {urls: `stun:stun.jam.systems:3478`},
        {urls: `${staticConfig.urls.stun}`},
        {
          ...staticConfig.urls.turnCredentials,
          urls: `${staticConfig.urls.turn}`,
        },
      ],
    },
  });
}
configSwarm();
on(staticConfig, () => configSwarm());

// leave room when same peer joins it from elsewhere and I'm in room
// TODO: currentId() is called too early to react to any changes!
on(swarm.connectionState, currentId(), myConnState => {
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

on(swarm, 'newPeer', async id => {
  for (let i = 0; i < 5; i++) {
    // try multiple times to lose race with the first POST /identities
    let [data, ok] = await get(`/identities/${id}`);
    if (ok) {
      state.identities[id] = data;
      update(state, 'identities');
      return;
    }
  }
});
