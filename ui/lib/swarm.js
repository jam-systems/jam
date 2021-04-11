import State from 'use-minimal-state';
import {authenticatedHub} from './signalhub';
import causalLog from './causal-log';
import {
  newConnection,
  connectPeer,
  addStreamToPeer,
  handleSignal,
} from './peer';

// public API starts here

const swarm = State({
  // state
  stickyPeers: {}, // {peerId: {connections: {connId: {state: {}, lastFailure: number, pc: SimplePeer, timeout, peerId, connId}}}
  myPeer: {connections: {}}, // other sessions of same peer
  myPeerId: null,
  connected: false,
  remoteStreams: [], // [{stream, name, peerId}], only one per (name, peerId) if name is set
  peerState: {}, // {peerId: sharedState}
  sharedState: null, // my portion of peerState, gets shared on update and on peer join
  // internal
  url: '',
  room: '',
  debug: false,
  hub: null,
  localStreams: {},
  reduceState: (_allStates, oldState, newState) => newState || oldState,
  // events
  stream: null,
  data: null,
  newPeer: null,
  failedConnection: null,
  sharedEvent: null,
  peerEvent: null,
  anonymous: null,
});

export default swarm;

function config({
  url,
  room,
  myPeerId,
  sign,
  verify,
  reduceState,
  pcConfig,
  debug,
}) {
  if (url) swarm.url = url;
  if (room) swarm.room = room;
  if (myPeerId) swarm.myPeerId = myPeerId;
  if (sign) swarm.sign = sign; // sign(state): string
  if (verify) swarm.verify = verify; // verify(signedState, peerId): state | undefined
  if (reduceState) swarm.reduceState = reduceState; // reduceState([state], oldState, newState?): state
  if (pcConfig) swarm.pcConfig = pcConfig;
  if (debug) swarm.debug = debug;
}

function addLocalStream(stream, name) {
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

swarm.on('sharedState', data => {
  let {hub, myPeerId, myConnId} = swarm;
  if (!hub || !myPeerId || !myConnId) return;
  hub.broadcast('all', {
    type: 'shared-state',
    peerId: myPeerId,
    connId: myConnId,
    data,
  });
});

swarm.on('sharedEvent', data => {
  let {hub, myPeerId, myConnId} = swarm;
  if (!hub || !myPeerId || !myConnId) return;
  hub.broadcast('all', {
    type: 'shared-event',
    peerId: myPeerId,
    connId: myConnId,
    data,
  });
});

export {config, connect, disconnect, addLocalStream};

swarm.config = config;
swarm.connect = connect;
swarm.disconnect = disconnect;
swarm.addLocalStream = addLocalStream;

// public API ends here

function connect(room) {
  if (swarm.hub) return;
  swarm.config({room});
  if (!swarm.room || !swarm.url) {
    return console.error(
      'Must call swarm.config({url, room}) before connecting!'
    );
  }
  let myConnId = randomHex4();
  swarm.myConnId = myConnId;
  log('connecting. conn id', myConnId);
  let {myPeerId, sign, verify, sharedState} = swarm;
  let hub = authenticatedHub({
    room: swarm.room,
    url: swarm.url,
    myPeerId,
    sign,
    verify,
  });

  hub
    .broadcast('all', {
      type: 'connect-me',
      peerId: myPeerId,
      connId: myConnId,
      sharedState,
    })
    .then(() => {
      swarm.set('connected', true);
    })
    .catch(err => {
      console.error('error connecting to signalhub');
      console.error(err);
      disconnect();
    });
  swarm.hub = hub;

  hub.subscribe('all', ({type, peerId, connId, data, sharedState}) => {
    if (type === 'connect-me') {
      if (peerId === myPeerId && connId === myConnId) return;
      log('got connect-me');
      initializePeer(swarm, peerId);
      let connection = getConnection(swarm, peerId, connId);
      newPeerState(connection, sharedState);
      connectPeer(connection);
    }
    if (type === 'shared-state') {
      let connection = getConnection(swarm, peerId, connId);
      newPeerState(connection, data);
    }
    if (type === 'shared-event') {
      swarm.emit('peerEvent', peerId, data);
    }
  });

  hub.subscribe(
    myPeerId,
    ({type, peerId, data, connId, yourConnId, sharedState}) => {
      if (yourConnId !== myConnId) {
        // console.warn('message to different session, should be ignored');
        log('ignoring msg to different session', yourConnId);
        return;
      }
      if (type === 'signal') {
        log('signal received from', s(peerId), connId, data.type);
        initializePeer(swarm, peerId);
        let connection = getConnection(swarm, peerId, connId);
        newPeerState(connection, sharedState);
        handleSignal(connection, {data});
      }
    }
  );

  hub.subscribeAnonymous('anonymous', data => {
    swarm.emit('anonymous', data);
  });
}

function disconnect() {
  let {hub} = swarm;
  if (hub) hub.close();
  swarm.hub = null;
  swarm.myConnId = null;
  swarm.set('connected', false);
  for (let connection of yieldConnections(swarm)) {
    try {
      connection.pc.destroy();
    } catch (e) {}
    removeConnection(connection);
  }
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
  if (peer !== undefined) delete peer.connections[connId];
  updatePeerState(swarm, peerId);
  let nConnections = Object.keys(peer?.connections || {}).length;
  if (nConnections > 0 || peerId === swarm.myPeerId) return;

  delete swarm.stickyPeers[peerId];
  swarm.update('stickyPeers');
  delete swarm.peerState[peerId];
  swarm.update('peerState');
  let {remoteStreams} = swarm;
  if (remoteStreams.find(streamObj => streamObj.peerId === peerId)) {
    swarm.set(
      'remoteStreams',
      remoteStreams.filter(streamObj => streamObj.peerId !== peerId)
    );
  }
}
swarm.on('failedConnection', c => removeConnection(c));

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

function newPeerState(connection, newState) {
  if (newState === undefined) return;
  let {swarm, peerId} = connection;
  connection.state = newState;
  updatePeerState(swarm, peerId, newState);
}

function updatePeerState(swarm, peerId, newState) {
  let peer = getPeer(swarm, peerId);
  let allStates = Object.values(peer.connections).map(c => c.state);
  if (peerId === swarm.myPeerId) allStates.push(swarm.sharedState);
  let oldState = swarm.peerState[peerId];
  let state = newState || oldState;
  try {
    state = swarm.reduceState(allStates, oldState, newState);
  } catch (err) {
    console.error(err);
  }
  swarm.peerState[peerId] = state;
  swarm.update('peerState');
}

function randomHex4() {
  return ((Math.random() * 16 ** 4) | 0).toString(16).padStart(4, '0');
}

let s = id => id.slice(0, 2);

let log = (...a) => {
  if (!swarm.debug) return;
  let d = new Date();
  let time = `[${d.toLocaleTimeString('de-DE')},${String(
    d.getMilliseconds()
  ).padStart(3, '0')}]`;
  causalLog(time, ...a);
};
