import log from '../../lib/causal-log';
import {signData, verifyData} from '../../lib/identity-utils';
import {useDispatch, useEvent, useOn, useUpdate} from '../../lib/state-tree';
import {get, populateApiCache} from '../backend';
import {staticConfig} from '../config';
import {actions} from '../state';
import {domEvent} from '../../lib/util';
import {DISCONNECTED, INITIAL} from '../../lib/swarm-health';
import {useStableObject} from '../../lib/state-diff';
let onload = domEvent(window, 'load');

export default function ConnectRoom({myIdentity, swarm}) {
  let connectedRoomId = null;
  configSwarmIdentity(swarm, myIdentity);
  configSwarm(swarm, staticConfig);
  useOn(staticConfig, conf => configSwarm(swarm, conf));

  const identities = {};
  let update = useUpdate();
  let dispatch = useDispatch();
  let otherDeviceInRoom = false;

  return function ConnectRoom({roomId, hasRoom, inRoom, myIdentity}) {
    let myId = myIdentity.publicKey;
    let shouldConnect = hasRoom && roomId;

    if (shouldConnect) {
      if (
        swarm.connectState === INITIAL ||
        swarm.connectState === DISCONNECTED ||
        roomId !== swarm.room ||
        myId !== swarm.myPeerId
      ) {
        connectedRoomId = roomId;
        log('connecting room', roomId);
        swarm.config({
          sign: data => signData(myIdentity, data),
        });
        swarm.connect(roomId, myId);
      }
    } else {
      if (swarm.connectState !== INITIAL) {
        connectedRoomId = null;
        swarm.disconnect();
      }
    }

    let {peerEvent, serverEvent, connectionState} = swarm;

    // collect real-time peer identity info
    let [isNewPeer, id] = useEvent(swarm, 'newPeer');
    if (isNewPeer) {
      (async () => {
        for (let i = 0; i < 5; i++) {
          // try multiple times to lose race with the first POST /identities
          let [data, ok] = await get(`/identities/${id}`);
          if (ok) {
            identities[id] = data;
            update();
            return;
          } else {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      })();
    }
    let [isIdentityUpdate, peerId, data] = useEvent(
      peerEvent,
      'identity-update'
    );
    if (isIdentityUpdate) {
      identities[peerId] = data;
    }
    // merge in real-time room info
    let [isRoomUpdate, room] = useEvent(serverEvent, 'room-info');
    if (isRoomUpdate) {
      log('new room info', room);
      if (connectedRoomId !== null) {
        populateApiCache(`/rooms/${connectedRoomId}`, room);
      }
    }

    // is the user in the same room with another device?
    // leave room when same peer joins from elsewhere
    let [isMyConnectionState, myConnState] = useEvent(connectionState, myId);
    if (isMyConnectionState) {
      if (myConnState === undefined) {
        otherDeviceInRoom = false;
      }
      let {states, latest} = myConnState;
      let {myConnId} = swarm;
      otherDeviceInRoom = false;
      for (let connId in states) {
        if (connId !== myConnId && states[connId].state.inRoom) {
          otherDeviceInRoom = true;
          if (connId === latest && inRoom) {
            dispatch(actions.JOIN, null);
          }
          break;
        }
      }
    }

    return {identities: useStableObject({...identities}), otherDeviceInRoom};
  };
}

function configSwarmIdentity(swarm, myIdentity) {
  let myId = myIdentity.publicKey;
  swarm.config({
    myPeerId: myId,
    sign: data => signData(myIdentity, data),
    verify: verifyData,
  });
}

function configSwarm(swarm, staticConfig) {
  swarm.config({
    url: staticConfig.urls.pantry,
    autoConnect: false,
    debug: staticConfig.development,
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
