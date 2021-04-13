import State from 'use-minimal-state';
import {authenticatedHub} from './signalhub';
import causalLog from './causal-log';
import {
  newConnection,
  connectPeer,
  addStreamToPeer,
  handleSignal,
  handlePing,
  handlePong,
} from './swarm-peer';
import {removePeerState, updatePeerState} from './swarm-state';
import {DEV} from '../logic/config';

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
    // events
    stream: null,
    data: null,
    newPeer: null,
    failedConnection: null,
    sharedEvent: null,
    rawPeerState: null,
    peerEvent: null,
    anonymous: null,
  });
  swarm.config = (...args) => config(swarm, ...args);
  swarm.connect = (...args) => connect(swarm, ...args);
  swarm.disconnect = (...args) => disconnect(swarm, ...args);

  if (initialConfig !== undefined) {
    config(swarm, initialConfig);
  }

  swarm.on('sharedState', state => {
    let {hub, myPeerId, myConnId} = swarm;
    let time = Date.now();
    swarm.sharedStateTime = time;
    if (!hub || !myPeerId || !myConnId) return;
    hub.broadcast('all', {
      type: 'shared-state',
      peerId: myPeerId,
      connId: myConnId,
      state: {state, time},
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

  swarm.on('failedConnection', c => removeConnection(c));
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

export {config, connect, disconnect, addLocalStream};

// public API ends here

function connect(swarm, room) {
  if (swarm.hub) return;
  config(swarm, {room});
  if (!swarm.room || !swarm.url) {
    return console.error(
      'Must call swarm.config({url, room}) before connecting!'
    );
  }
  let myConnId = randomHex4();
  swarm.myConnId = myConnId;
  log('connecting. conn id', myConnId);
  let {myPeerId, sign, verify} = swarm;
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
      state: {state: swarm.sharedState, time: swarm.sharedStateTime},
    })
    .then(() => {
      swarm.set('connected', true);
    })
    .catch(err => {
      console.error('error connecting to signalhub');
      console.error(err);
      disconnect(swarm);
    });
  swarm.hub = hub;

  hub.subscribe('all', ({type, peerId, connId, data, state}) => {
    initializePeer(swarm, peerId);
    if (type === 'connect-me') {
      if (peerId === myPeerId && connId === myConnId) return;
      log('got connect-me');
      let connection = getConnection(swarm, peerId, connId);
      updatePeerState(connection, state);
      connectPeer(connection);
    }
    if (type === 'shared-state') {
      let connection = getConnection(swarm, peerId, connId);
      updatePeerState(connection, state);
    }
    if (type === 'shared-event') {
      swarm.emit('peerEvent', peerId, data);
    }
  });

  hub.subscribe(myPeerId, ({type, peerId, data, connId, yourConnId, state}) => {
    if (yourConnId !== myConnId) {
      // console.warn('message to different session, should be ignored');
      // log('ignoring msg to different session', yourConnId);
      return;
    }
    if (type === 'signal') {
      log('signal received from', s(peerId), connId, data.type);
      initializePeer(swarm, peerId);
      let connection = getConnection(swarm, peerId, connId);
      updatePeerState(connection, state);
      handleSignal(connection, {data});
    }
    if (type === 'ping') {
      handlePing(swarm, peerId, connId, data);
    }
    if (type === 'pong') {
      handlePong(swarm, peerId, connId, data);
    }
  });

  hub.subscribeAnonymous('anonymous', data => {
    swarm.emit('anonymous', data);
  });
}

function disconnect(swarm) {
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

function randomHex4() {
  return ((Math.random() * 16 ** 4) | 0).toString(16).padStart(4, '0');
}

let s = id => id.slice(0, 2);

let log = (...a) => {
  if (DEV) return;
  let d = new Date();
  let time = `[${d.toLocaleTimeString('de-DE')},${String(
    d.getMilliseconds()
  ).padStart(3, '0')}]`;
  causalLog(time, ...a);
};
