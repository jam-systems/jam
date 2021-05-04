import State, {emit, on, is, clear} from 'use-minimal-state';
import signalws from './signalws';
import {
  newConnection,
  connectPeer,
  addStreamToPeer,
  handleSignal,
  handlePeerFail,
  log,
} from './swarm-peer';
import {removePeerState, updatePeerState} from './swarm-state';

// public API starts here

function Swarm(initialConfig) {
  const swarm = State({
    // state
    stickyPeers: {}, // {peerId: {connections: {connId: {lastFailure: number, pc: SimplePeer, timeout, peerId, connId}}}
    myPeer: {connections: {}}, // other sessions of same peer
    myPeerId: null,
    connected: false,
    remoteStreams: [], // [{stream, name, peerId}], only one per (name, peerId) if name is set
    peerState: {}, // {peerId: sharedState}
    connectionState: {}, // {peerId: {latest: connId, states: {connId: {state, time}}}}
    sharedState: null, // my portion of peerState, gets shared on update and on peer join
    // internal
    url: '',
    room: '',
    debug: false,
    hub: null,
    localStreams: {},
    reduceState: (_states, _current, latest) => latest,
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
  });
  swarm.config = (...args) => config(swarm, ...args);
  swarm.connect = (...args) => connect(swarm, ...args);
  swarm.disconnect = (...args) => disconnect(swarm, ...args);

  if (initialConfig !== undefined) {
    config(swarm, initialConfig);
  }

  swarm.on('sharedState', state => {
    let time = Date.now();
    swarm.sharedStateTime = time;
    swarm.hub?.broadcast('all', {type: 'shared-state', state: {state, time}});
  });

  swarm.on('failedConnection', c => removeConnection(c));

  on(online, onl => {
    switch (swarm.connectState) {
      case DISCONNECTED:
        if (onl) connect(swarm, swarm.room);
        break;
      case CONNECTING:
      case CONNECTED:
        if (!onl) disconnectUnwanted(swarm);
        break;
      default:
    }
  });

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
  if (reduceState) swarm.reduceState = reduceState; // reduceState([state], currentState, latestState): state
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

export {config, connect, disconnect, addLocalStream, sendPeerEvent};

// public API ends here

// connection states
const INITIAL = 0;
const CONNECTING = 1;
const CONNECTED = 2;
const DISCONNECTED = 3;

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
    subscriptions: ['all', myCombinedPeerId],
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
    let connection = getConnection(swarm, peerId, connId);
    handlePeerFail(connection, true);
  });

  hub.broadcast('all', {
    type: 'shared-state',
    state: {state: swarm.sharedState, time: swarm.sharedStateTime},
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

  on(hub, myCombinedPeerId, ({type, peerId, data, connId, state}) => {
    if (type === 'signal') {
      log('signal received from', s(peerId), connId, data.type);
      initializePeer(swarm, peerId);
      let connection = getConnection(swarm, peerId, connId);
      updatePeerState(connection, state);
      handleSignal(connection, {data});
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
    swarm.update('stickyPeers');
    swarm.emit('newPeer', peerId);
  }
}

function getPeer(swarm, peerId) {
  return peerId === swarm.myPeerId ? swarm.myPeer : swarm.stickyPeers[peerId];
}

function getConnection(swarm, peerId, connId) {
  let peer = getPeer(swarm, peerId);
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
    let pc = peer.connections[connId]?.pc;
    if (pc !== undefined) {
      pc.garbage = true;
      try {
        pc.destroy();
      } catch (e) {}
    }
    delete peer.connections[connId];
  }
  let nConnections = Object.keys(peer?.connections || {}).length;
  if (nConnections === 0 && peerId !== swarm.myPeerId) {
    delete swarm.stickyPeers[peerId];
    let {remoteStreams} = swarm;
    if (remoteStreams.find(streamObj => streamObj.peerId === peerId)) {
      swarm.set(
        'remoteStreams',
        remoteStreams.filter(streamObj => streamObj.peerId !== peerId)
      );
    }
  }
  swarm.update('stickyPeers');
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

const online = [navigator.onLine];
window.addEventListener('online', () => is(online, true));
window.addEventListener('offline', () => is(online, false));

function randomHex4() {
  return ((Math.random() * 16 ** 4) | 0).toString(16).padStart(4, '0');
}

let s = id => id.slice(0, 2);
