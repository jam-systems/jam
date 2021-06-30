import {emit, on, is, clear, set, update} from 'minimal-state';
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
  disconnectPeer,
  addStreamToPeer,
  handleSignal,
  log,
} from './swarm-peer';
import {removePeerState, updatePeerState} from './swarm-state';
import {mergeObject} from './util';

// public API starts here

function Swarm(initialConfig) {
  const swarm = {
    // state
    peers: {}, // {peerId: {connections: {connId: {lastFailure: number, pc: SimplePeer, timeout, peerId, connId}}}
    myPeer: {connections: {}}, // other sessions of same peer
    myPeerId: null,
    connected: false,
    connectionStreams: [], // [{stream, name, peerId, connId}], only one per (name, peerId, connId) if name is set
    remoteStreams: [], // [{stream, name, peerId}], only one per (name, peerId) if name is set
    peerState: {}, // {peerId: state}
    connectionState: {}, // {peerId: {latest: connId, states: {connId: {state, time}}}}
    myPeerState: {}, // my portion of peerState, gets shared on update and on peer join
    // internal / config
    url: '',
    room: '',
    debug: false,
    autoConnect: true,
    hub: null,
    localStreams: {},
    reduceState: (_states, _current, latest) => latest,
    sharedStateTime: Date.now(),
    connectState: INITIAL,
    // events
    stream: null,
    data: null,
    newPeer: null,
    newConnection: null,
    failedConnection: null,
    rawPeerState: null,
    peerEvent: {},
    serverEvent: {},
  };
  swarm.config = (...args) => config(swarm, ...args);
  swarm.connect = (...args) => connect(swarm, ...args);
  swarm.disconnect = (...args) => disconnect(swarm, ...args);

  if (initialConfig !== undefined) {
    config(swarm, initialConfig);
  }

  on(swarm.myPeerState, () => {
    let time = Date.now();
    swarm.sharedStateTime = time;
    swarm.hub?.broadcast('all', {
      type: 'shared-state',
      data: {state: swarm.myPeerState, time},
    });
  });

  // TODO when websocket pinging to detect dead connections is implemented,
  // stop removing peers on a failed webrtc connection
  // the websocket server should be the single source of truth about what peers are connected
  on(swarm, 'failedConnection', c => {
    if (c === getConnection(swarm, c.peerId, c.connId)) removeConnection(c);
  });

  checkWsHealth(swarm);

  on(swarm.serverEvent, 'new-consumer', data => {
    log('got new consumer', data);
  });

  return swarm;
}

export default Swarm;

function config(
  swarm,
  {url, room, myPeerId, sign, verify, reduceState, pcConfig, debug, autoConnect}
) {
  mergeObject(swarm, {
    url,
    room,
    myPeerId,
    sign, // sign(state): string
    verify, // verify(signedState, peerId): state | undefined
    reduceState, // reduceState([state], currentState, latestState, findLatest): state
    pcConfig,
    debug,
    autoConnect,
  });
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
    data: {state, time},
  });
}
function shareStateWithPeer(swarm, peerId, state) {
  let time = Date.now();
  for (let connection of yieldConnectionsOfPeer(swarm, peerId)) {
    swarm.hub?.sendDirect(connection, {
      type: 'shared-state',
      data: {state, time},
    });
  }
}

export {
  config,
  connect,
  disconnect,
  connectPeer,
  disconnectPeer,
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

  on(hub, 'peers', peers_ => {
    for (let combinedPeerId of peers_) {
      if (combinedPeerId === myCombinedPeerId) continue;
      // note: the other peer will get add-peer and try to connect as well
      initializeConnection(swarm, combinedPeerId);
    }
  });
  on(hub, 'add-peer', combinedPeerId => {
    let connection = initializeConnection(swarm, combinedPeerId);
    hub.sendDirect(connection, {
      type: 'shared-state',
      data: {state: swarm.myPeerState, time: swarm.sharedStateTime},
    });
  });
  on(hub, 'remove-peer', id => {
    let [peerId, connId] = id.split(';');
    if (getPeer(swarm, peerId) === undefined) return;
    removeConnection({swarm, peerId, connId});
  });

  hub.broadcast('all', {
    type: 'shared-state',
    data: {state: swarm.myPeerState, time: swarm.sharedStateTime},
  });
  swarm.hub = hub;

  on(hub, 'all', ({type, peerId, connId, data}) => {
    initializePeer(swarm, peerId);
    if (type === 'shared-state') {
      let connection = getConnection(swarm, peerId, connId);
      updatePeerState(connection, data);
    }
    if (type === 'peer-event') {
      emit(swarm.peerEvent, data.t, peerId, data.d);
    }
  });

  on(hub, 'direct', ({type, peerId, connId, data}) => {
    initializePeer(swarm, peerId);
    if (type === 'signal') {
      log('signal received from', s(peerId), connId, data.type);
      let connection = getConnection(swarm, peerId, connId);
      handleSignal(connection, {data});
    }
    if (type === 'shared-state') {
      let connection = getConnection(swarm, peerId, connId);
      updatePeerState(connection, data);
    }
  });

  on(hub, 'server', ({t: event, d: payload}, accept) => {
    emit(swarm.serverEvent, event, payload, accept);
  });
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
  if (swarm.peers[peerId] === undefined) {
    swarm.peers[peerId] = {connections: {}};
    update(swarm, 'peers');
    emit(swarm, 'newPeer', peerId);
  }
}

function initializeConnection(swarm, combinedPeerId) {
  let [peerId, connId] = combinedPeerId.split(';');
  initializePeer(swarm, peerId);
  let connection = getConnection(swarm, peerId, connId);
  emit(swarm, 'newConnection', connection);
  if (swarm.autoConnect) connectPeer(connection);
  return connection;
}

function getPeer(swarm, peerId) {
  return peerId === swarm.myPeerId ? swarm.myPeer : swarm.peers[peerId];
}

function getConnection(swarm, peerId, connId) {
  let peer = getPeer(swarm, peerId);
  if (peer === undefined) return;
  let connection = peer.connections[connId];
  if (connection === undefined) {
    connection = newConnection({swarm, peerId, connId});
    peer.connections[connId] = connection;
    update(swarm, 'peers');
  }
  return connection;
}

function removeConnection({swarm, peerId, connId}) {
  log('removing peer', s(peerId), connId);
  let peer = getPeer(swarm, peerId);
  if (peer !== undefined) {
    let connection = peer.connections[connId];
    if (connection !== undefined) {
      disconnectPeer(connection);
    }
    delete peer.connections[connId];
  }
  let nConnections = Object.keys(peer?.connections || {}).length;
  if (nConnections === 0 && peerId !== swarm.myPeerId) {
    delete swarm.peers[peerId];
  }
  update(swarm, 'peers');
  removePeerState({swarm, peerId, connId});
}

function* yieldConnections(swarm) {
  let {peers, myPeer} = swarm;
  for (let connId in myPeer.connections) {
    yield myPeer.connections[connId];
  }
  for (let peerId in peers) {
    let {connections} = peers[peerId];
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
