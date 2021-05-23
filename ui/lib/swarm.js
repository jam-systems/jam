import {emit, on, is, clear, set, update} from 'use-minimal-state';
import signalws from './signalws';
import {
  checkWsHealth,
  INITIAL,
  CONNECTED,
  CONNECTING,
  DISCONNECTED,
} from './swarm-health';
import {
  newConnection,
  connectPeer,
  addStreamToPeer,
  handleSignal,
  stopTimeout,
  log,
} from './swarm-peer';
import {removePeerState, updatePeerState} from './swarm-state';

// public API starts here

function Swarm(initialConfig) {
  const swarm = {
    // state
    stickyPeers: {}, // {peerId: {connections: {connId: {lastFailure: number, pc: SimplePeer, timeout, peerId, connId}}}
    myPeer: {connections: {}}, // other sessions of same peer
    myPeerId: null,
    connected: false,
    remoteStreams: [], // [{stream, name, peerId}], only one per (name, peerId) if name is set
    peerState: {}, // {peerId: state}
    connectionState: {}, // {peerId: {latest: connId, states: {connId: {state, time}}}}
    myPeerState: {}, // my portion of peerState, gets shared on update and on peer join
    // internal
    url: '',
    room: '',
    debug: false,
    hub: null,
    localStreams: {},
    reduceState: (_states, _current, latest, _findLatest) => latest,
    sharedStateTime: Date.now(),
    connectState: INITIAL,
    // events
    stream: null,
    data: null,
    newPeer: null,
    failedConnection: null,
    rawPeerState: null,
    peerEvent: {},
    serverEvent: {},
    anonymous: null,
  };
  swarm.config = (...args) => config(swarm, ...args);
  swarm.connect = (...args) => connect(swarm, ...args);
  swarm.disconnect = (...args) => disconnect(swarm, ...args);

  if (initialConfig !== undefined) {
    config(swarm, initialConfig);
  }

  on(swarm.myPeerState, (_key, _value) => {
    let time = Date.now();
    swarm.sharedStateTime = time;
    swarm.hub?.broadcast('all', {
      type: 'shared-state',
      state: {state: swarm.myPeerState, time},
    });
  });

  on(swarm, 'failedConnection', c => {
    if (c === getConnection(swarm, c.peerId, c.connId)) removeConnection(c);
  });

  checkWsHealth(swarm);

  return swarm;
}

export default Swarm;

function config(
  swarm,
  {url, room, myPeerId, sign, verify, reduceState, pcConfig, debug}
) {
  if (url) swarm.url = url;
  if (room) swarm.room = room;
  if (myPeerId) swarm.myPeerId = myPeerId;
  if (sign) swarm.sign = sign; // sign(state): string
  if (verify) swarm.verify = verify; // verify(signedState, peerId): state | undefined
  if (reduceState) swarm.reduceState = reduceState; // reduceState([state], currentState, latestState, findLatest): state
  if (pcConfig) swarm.pcConfig = pcConfig;
  if (debug) swarm.debug = debug;
}

function addLocalStream(swarm, stream, name) {
  log('addlocalstream', stream, name);
  if (!name) name = randomHex4();
  swarm.localStreams[name] = stream;
  try {
    for (let connection of yieldConnections(swarm)) {
      addStreamToPeer(connection, stream, name);
    }
  } catch (err) {
    console.error('ERROR: add stream to peers');
    console.error(err);
  }
}

function sendPeerEvent(swarm, event, payload) {
  swarm.hub?.broadcast('all', {
    type: 'peer-event',
    data: {t: event, d: payload},
  });
}

// these two don't quite fit the original model of peer state but use its
// nice infrastructure on the remote side to present something which can come from different connections
// as one state of the "peer"
function shareStateWithGroup(swarm, topic, state) {
  let time = Date.now();
  swarm.hub?.broadcast(topic, {
    type: 'shared-state',
    state: {state, time},
  });
}
function shareStateWithPeer(swarm, peerId, state) {
  let time = Date.now();
  for (let connection of yieldConnectionsOfPeer(swarm, peerId)) {
    swarm.hub?.sendDirect(connection, {
      type: 'shared-state',
      state: {state, time},
    });
  }
}

export {
  config,
  connect,
  disconnect,
  addLocalStream,
  sendPeerEvent,
  shareStateWithGroup,
  shareStateWithPeer,
};

// public API ends here

function connect(swarm, room) {
  config(swarm, {room});
  if (!swarm.room || !swarm.url) {
    return console.error(
      'Must call swarm.config({url, room}) before connecting!'
    );
  }
  switch (swarm.connectState) {
    case CONNECTED:
    case CONNECTING:
      return;
    case DISCONNECTED:
      if (swarm.hub) {
        clear(swarm.hub);
        swarm.hub.close();
      }
      for (let connection of yieldConnections(swarm)) {
        removeConnection(connection);
      }
      break;
    default:
  }
  let myConnId = randomHex4();
  swarm.myConnId = myConnId;
  log('connecting. conn id', myConnId);
  swarm.connectState = CONNECTING;
  let {myPeerId, sign, verify} = swarm;
  let myCombinedPeerId = `${myPeerId};${myConnId}`;
  let hub = signalws({
    roomId: swarm.room,
    url: swarm.url,
    myPeerId,
    myConnId,
    sign,
    verify,
    subscriptions: ['all'],
  });
  on(hub, 'opened', () => {
    swarm.connectState = CONNECTED;
    is(swarm, 'connected', true);
  });
  on(hub, 'closed', () => {
    disconnectUnwanted(swarm);
  });

  function initializeConnection(combinedPeerId) {
    let [peerId, connId] = combinedPeerId.split(';');
    initializePeer(swarm, peerId);
    let connection = getConnection(swarm, peerId, connId);
    connectPeer(connection);
  }

  on(hub, 'peers', peers => {
    for (let id of peers) {
      if (id === myCombinedPeerId) continue;
      // note: the other peer will get add-peer and try to connect as well
      initializeConnection(id);
    }
  });
  on(hub, 'add-peer', id => initializeConnection(id));
  on(hub, 'remove-peer', id => {
    let [peerId, connId] = id.split(';');
    if (getPeer(swarm, peerId) === undefined) return;
    removeConnection({swarm, peerId, connId});
  });

  hub.broadcast('all', {
    type: 'shared-state',
    state: {state: swarm.myPeerState, time: swarm.sharedStateTime},
  });
  swarm.hub = hub;

  on(hub, 'all', ({type, peerId, connId, data, state}) => {
    initializePeer(swarm, peerId);
    if (type === 'shared-state') {
      let connection = getConnection(swarm, peerId, connId);
      updatePeerState(connection, state);
    }
    if (type === 'peer-event') {
      emit(swarm.peerEvent, data.t, peerId, data.d);
    }
  });

  on(hub, 'direct', ({type, peerId, data, connId, state}) => {
    initializePeer(swarm, peerId);
    if (type === 'signal') {
      log('signal received from', s(peerId), connId, data.type);
      let connection = getConnection(swarm, peerId, connId);
      updatePeerState(connection, state);
      handleSignal(connection, {data});
    }
    if (type === 'shared-state') {
      let connection = getConnection(swarm, peerId, connId);
      updatePeerState(connection, state);
    }
  });

  on(hub, 'server', ({t: event, d: payload}) =>
    emit(swarm.serverEvent, event, payload)
  );
}

function disconnect(swarm) {
  if (swarm.hub) swarm.hub.close();
  swarm.hub = null;
  swarm.myConnId = null;
  swarm.connectState = INITIAL;
  is(swarm, 'connected', false);
  for (let connection of yieldConnections(swarm)) {
    removeConnection(connection);
  }
}

function disconnectUnwanted(swarm) {
  if (swarm.connectState === INITIAL) return;
  swarm.connectState = DISCONNECTED;
  is(swarm, 'connected', false);
}

function initializePeer(swarm, peerId) {
  if (peerId === swarm.myPeerId) return;
  if (swarm.stickyPeers[peerId] === undefined) {
    swarm.stickyPeers[peerId] = {connections: {}};
    update(swarm, 'stickyPeers');
    emit(swarm, 'newPeer', peerId);
  }
}

function getPeer(swarm, peerId) {
  return peerId === swarm.myPeerId ? swarm.myPeer : swarm.stickyPeers[peerId];
}

function getConnection(swarm, peerId, connId) {
  let peer = getPeer(swarm, peerId);
  if (peer === undefined) return;
  let connection = peer.connections[connId];
  if (connection === undefined) {
    connection = newConnection({swarm, peerId, connId});
    peer.connections[connId] = connection;
  }
  return connection;
}

function removeConnection({swarm, peerId, connId}) {
  log('removing peer', s(peerId), connId);
  let peer = getPeer(swarm, peerId);
  if (peer !== undefined) {
    let connection = peer.connections[connId];
    if (connection !== undefined) {
      stopTimeout(connection);
      let {pc} = connection;
      if (pc !== undefined) {
        pc.garbage = true;
        try {
          pc.destroy();
        } catch (e) {}
      }
    }
    delete peer.connections[connId];
  }
  let nConnections = Object.keys(peer?.connections || {}).length;
  if (nConnections === 0 && peerId !== swarm.myPeerId) {
    delete swarm.stickyPeers[peerId];
    let {remoteStreams} = swarm;
    if (remoteStreams.find(streamObj => streamObj.peerId === peerId)) {
      set(
        swarm,
        'remoteStreams',
        remoteStreams.filter(streamObj => streamObj.peerId !== peerId)
      );
    }
  }
  update(swarm, 'stickyPeers');
  removePeerState({swarm, peerId, connId});
}

function* yieldConnections(swarm) {
  let {stickyPeers, myPeer} = swarm;
  for (let connId in myPeer.connections) {
    yield myPeer.connections[connId];
  }
  for (let peerId in stickyPeers) {
    let {connections} = stickyPeers[peerId];
    for (let connId in connections) {
      yield connections[connId];
    }
  }
}

function* yieldConnectionsOfPeer(swarm, peerId) {
  let peer = getPeer(swarm, peerId);
  if (peer === undefined) return;
  let {connections} = peer;
  for (let connId in connections) {
    yield connections[connId];
  }
}

function randomHex4() {
  return ((Math.random() * 16 ** 4) | 0).toString(16).padStart(4, '0');
}

let s = id => id.slice(0, 2);
