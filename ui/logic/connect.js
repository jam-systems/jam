import {is, on, update} from 'use-minimal-state';
import log from '../lib/causal-log';
import {useRootState} from '../lib/state-tree';
import {get} from './backend';
import {staticConfig} from './config';
import {populateCache} from './GetRequest';
import {currentId, signData, verifyData} from './identity';
import {swarm} from './state';

// TODO this is an intermediary component to set up swarm that should be replaced w/ one that
// properly integrates with swarm (knows connection state, returns remote streams etc)

export function ConnectRoom() {
  let connectedRoomId = null;
  configSwarm(staticConfig);
  is(swarm.myPeerState, {inRoom: false, micMuted: false, leftStage: false});

  const state = useRootState();

  on(swarm.peerEvent, 'identity-update', async peerId => {
    let [data, ok] = await get(`/identities/${peerId}`);
    if (ok) {
      state.identities[peerId] = data;
      update(state, 'identities');
    }
  });
  on(swarm.serverEvent, 'room-info', data => {
    log('new room info', data);
    if (connectedRoomId !== null) {
      populateCache(`/rooms/${connectedRoomId}`, data);
    }
  });

  return function ConnectRoom({roomId, shouldConnect}) {
    if (shouldConnect && roomId && connectedRoomId !== roomId) {
      connectedRoomId = roomId;
      if (swarm.room === roomId && swarm.hub) return;
      log('connecting room', roomId);
      if (swarm.hub) swarm.disconnect();
      // make sure peerId is the current one
      swarm.config({myPeerId: currentId()});
      swarm.connect(roomId);
    } else if ((!shouldConnect || !roomId) && connectedRoomId !== null) {
      connectedRoomId = null;
      if (swarm.connected && swarm.room === roomId) swarm.disconnect();
    }
  };
}

function configSwarm(staticConfig) {
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
        // {urls: `stun:stun.jam.systems:3478`},
        {urls: [`${staticConfig.urls.stun}`, `stun:stun.jam.systems:3478`]},
        {
          ...staticConfig.urls.turnCredentials,
          urls: `${staticConfig.urls.turn}`,
        },
      ],
    },
  });
}
on(staticConfig, conf => configSwarm(conf));
