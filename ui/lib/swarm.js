import SimplePeer from 'simple-peer-light';
import State from './minimal-state.js';
import signalhub from './signalhub.js';
import {verifyToken, signedToken} from '../identity';

const LOGGING = true;
const MAX_CONNECT_TIME = 3000;
const MAX_CONNECT_TIME_AFTER_ICE_DISCONNECT = 2000;
const MIN_MAX_CONNECT_TIME_AFTER_SIGNAL = 2000;
const MAX_FAIL_TIME = 20000;

// public API starts here

const swarm = State({
  // state
  peers: {},
  stickyPeerInfo: {}, // peerId: {lastFailure: number, hadStream: boolean}
  myPeerId: null,
  connected: false,
  remoteStreams: [], // {stream, name, peerId}, only one per (name, peerId) if name is set
  sharedPeerState: {}, // peerId: any
  mySharedPeerState: null,
  // internal
  url: '',
  room: '',
  hub: null,
  localStreams: {},
  // events
  stream: null,
  data: null,
  newPeer: null,
  mutedPeers: {},
});

export default swarm;

function config({url, room, myPeerId, sign, verify}) {
  if (url) swarm.url = url;
  if (room) swarm.room = room;
  if (myPeerId) swarm.myPeerId = myPeerId;
  if (sign) swarm.sign = sign; // sign(state): string
  if (verify) swarm.verify = verify; // verify(state, authToken, peerId): boolean
}

function addLocalStream(stream, name) {
  log('addlocalstream', stream, name);
  if (!name) name = randomHex4();
  swarm.localStreams[name] = stream;
  addStreamToPeers(stream, name);
}

function shareState(state) {
  let {hub, myPeerId, sign, mySharedPeerState} = swarm;
  if (typeof state === 'function') {
    state = state(mySharedPeerState || null);
  }
  swarm.set('mySharedPeerState', state);
  if (!hub || !myPeerId) return;
  let data = {peerId: myPeerId, state};
  if (sign) data.authToken = sign(state);
  hub.broadcast('shared-state', data);
}

export {config, connect, disconnect, reconnect, addLocalStream, shareState};

swarm.config = config;
swarm.connect = connect;
swarm.disconnect = disconnect;
swarm.reconnect = reconnect;
swarm.addLocalStream = addLocalStream;
swarm.shareState = shareState;

// public API ends here

function createPeer(peerId, connId, initiator) {
  let {hub, localStreams, peers, myPeerId} = swarm;
  if (!myPeerId || peerId === myPeerId) return;
  // destroy any existing peer
  let peer = peers[peerId];
  if (peer) {
    log('destroying old peer', s(peerId));
    peer.garbage = true;
    peer.destroy();
  }
  log('creating peer', s(peerId), connId);

  let streams = Object.values(localStreams).filter(x => x);
  peer = new SimplePeer({
    initiator,
    config: {
      iceTransportPolicy: 'relay', // TODO: shouldn't this be 'all'?
      iceServers: [
        {urls: 'stun:stun.turn.systems:3478'},
        {
          urls: 'turn:turn.jam.systems:3478',
          username: 'test',
          credential: 'yieChoi0PeoKo8ni',
        },
      ],
    },
    trickle: true,
    streams,
    // debug: true,
  });
  peer.peerId = peerId;
  peer.connId = connId;
  peer.streams = {...localStreams};
  peers[peerId] = peer;
  swarm.update('peers');

  peer.connectStart = Date.now();
  timeoutPeer(peer, MAX_CONNECT_TIME);

  peer.didSignal = false;

  peer.on('signal', data => {
    log('signaling to', s(peerId), connId, data.type);
    // tell peer how to identify streams
    // TODO: it may at one point become necessary to use transceiver.mid instead of stream.id
    let remoteStreamIds = [];
    for (let name in peer.streams) {
      let stream = peer.streams[name];
      if (stream) {
        remoteStreamIds.push([name, stream.id]);
      }
    }
    data.meta = {remoteStreamIds};
    data.from = peer._id;
    if (!peer.didSignal) {
      data.first = true;
      peer.didSignal = true;
    }
    hub.broadcast(`signal-${peerId}`, {
      peerId: myPeerId,
      connId: hub.connId,
      yourConnId: connId,
      data,
    });
  });
  peer.on('connect', () => {
    log('connected peer', s(peerId), 'after', Date.now() - peer.connectStart);
    handlePeerSuccess(peer);
    swarm.update('peers');
  });

  peer.on('data', rawData => {
    log('data (channel) from', s(peerId));
    swarm.emit('data', rawData);
  });

  peer.on('stream', stream => {
    let remoteStreamInfo =
      peer.remoteStreamIds &&
      peer.remoteStreamIds.find(([, id]) => id === stream.id);
    let name = remoteStreamInfo && remoteStreamInfo[0];
    let remoteStreams = [...swarm.remoteStreams];
    let i = remoteStreams.findIndex(
      streamObj => streamObj.peerId === peerId && streamObj.name === name
    );
    if (i === -1) i = remoteStreams.length;
    remoteStreams[i] = {stream, name, peerId};
    swarm.set('remoteStreams', remoteStreams);
    swarm.emit('stream', stream, name, peer);
    swarm.stickyPeerInfo[peerId].hadStream = true;
  });

  peer.on('error', err => {
    if (!peer.garbage) log('error', err);
  });
  peer.on('iceStateChange', state => {
    log('ice state', state);
    if (state === 'disconnected') {
      timeoutPeer(
        peer,
        MAX_CONNECT_TIME_AFTER_ICE_DISCONNECT,
        'peer timed out after ice disconnect'
      );
    }
    if (state === 'connected' || state === 'completed') {
      handlePeerSuccess(peer);
    }
  });
  peer.on('close', () => {
    handlePeerFail(peer);
  });
  return peer;
}

function timeoutPeer(peer, delay, message) {
  let info = swarm.stickyPeerInfo[peer.peerId];
  let now = Date.now();
  info.lastFailure = info.lastFailure || now;
  clearTimeout(peer.timeout);
  delay = Math.max(0, (peer.timeoutEnd || 0) - now, delay);
  peer.timeoutEnd = now + delay;
  if (message) peer.timeoutMessage = message;
  peer.timeout = setTimeout(() => {
    log(peer.timeoutMessage || 'peer timed out');
    handlePeerFail(peer);
  }, delay);

  log('timeout peer in', delay);
}

function addToTimeout(peer, delay) {
  if (peer.timeout) timeoutPeer(peer, delay);
}

function stopTimeout(peer) {
  clearTimeout(peer.timeout);
  peer.timeout = null;
  peer.timeoutMessage = '';
  peer.timeoutEnd = 0;
}

function handlePeerSuccess(peer) {
  let info = swarm.stickyPeerInfo[peer.peerId];
  info.lastFailure = null;
  stopTimeout(peer);
}

function handlePeerFail(peer) {
  // peer either took too long to fire 'connect', or fired an error-like event
  // depending how long we already tried, either reconnect or remove peer
  let {peerId, connId} = peer;
  let {peers, stickyPeerInfo, hub} = swarm;
  stopTimeout(peer);

  // don't do anything if we already replaced this Peer instance
  if (peers[peerId] !== peer || peer.garbage) return;

  let info = stickyPeerInfo[peer.peerId];
  let now = Date.now();
  info.lastFailure = info.lastFailure || now;
  let failTime = now - info.lastFailure;

  log('handle peer fail! time failing:', failTime);

  if (failTime > MAX_FAIL_TIME) {
    delete stickyPeerInfo[peer.peerId];
    swarm.update('stickyPeerInfo');
    removePeer(peerId, peer);
  } else {
    connectPeer(hub, peerId, connId);
  }
}

function removePeer(peerId, peer) {
  let {peers} = swarm;
  if (!peers[peerId] || (peer && peer !== peers[peerId])) return;
  console.log('removing peer', s(peerId));
  delete peers[peerId];
  let {remoteStreams} = swarm;
  if (remoteStreams.find(streamObj => streamObj.peerId === peerId)) {
    swarm.set(
      'remoteStreams',
      remoteStreams.filter(streamObj => streamObj.peerId !== peerId)
    );
  }
  swarm.update('peers');
}

function addPeerMetaData(peer, data) {
  if (!data) return;
  try {
    for (let key in data) {
      peer[key] = data[key];
    }
  } catch (err) {
    console.error(err);
  }
}

function addStreamToPeers(stream, name) {
  let {peers} = swarm;
  for (let peerId in peers) {
    let peer = peers[peerId];
    let oldStream = peer.streams[name];
    let addStream = () => {
      log('adding stream to', s(peerId), name);
      peer.streams[name] = stream;
      if (stream) peer.addStream(stream);
    };
    // log(kind, 'old', oldStream, 'new', stream);
    if (oldStream) {
      if (oldStream === stream) return; // avoid error if listener is called twice
      peer.removeStream(oldStream);
      // this code path throws an error if the stream already existed at the peer earlier
      // -- but that shouldn't happen!
      // if it should ever do, maybe we could use replaceTrack() instead of removeStream()
      // in the catch handler
      addStream();
    } else {
      addStream();
    }
  }
}

function initializePeer(peerId) {
  let {stickyPeerInfo} = swarm;
  if (!stickyPeerInfo[peerId]) {
    stickyPeerInfo[peerId] = {
      hadStream: false,
      lastFailure: null,
    };
    swarm.update('stickyPeerInfo');
    swarm.emit('newPeer', peerId);
  }
}

function connectPeer(hub, peerId, connId) {
  // connect to a peer whose peerId & connId we already know
  // either after being pinged by connect-me or as a retry
  // SPEC:
  // -) this has to be callable by both peers without race conflict
  // -) this has to work in every state of swarm.peers (e.g. with or without existing Peer instance)
  log('connecting peer', s(peerId), connId);
  let {myPeerId, peers} = swarm;
  if (myPeerId > peerId) {
    log('i initiate, and override any previous peer!');
    createPeer(peerId, connId, true);
  } else {
    log('i dont initiate, wait for first signal');
    hub.broadcast(`no-you-connect-${peerId}`, {
      peerId: myPeerId,
      connId: hub.connId,
      yourConnId: connId,
    });
    let peer = peers[peerId];
    if (peer) {
      log('destroying old peer', s(peerId));
      peer.garbage = true;
      peer.destroy();
    }
    log('sent no-you-connect', s(peerId));
  }
}

function connect(url, room) {
  if (swarm.hub) return;
  swarm.config({url, room});
  if (!swarm.room || !swarm.url) {
    return console.error(
      'Must call swarm.config(url, room) before connecting!'
    );
  }
  let myConnId = randomHex4();
  log('connecting. conn id', myConnId);
  let hub = signalhub(swarm.room, swarm.url);
  let {myPeerId} = swarm;
  hub
    .broadcast('connect-me', {
      peerId: myPeerId,
      connId: myConnId,
    })
    .then(() => {
      swarm.set('connected', true);
    })
    .catch(err => {
      console.error('error connecting to signalhub');
      console.error(err);
      disconnect();
    });

  hub.connId = myConnId;
  swarm.hub = hub;

  hub.subscribe('connect-me', ({peerId, connId}) => {
    if (peerId === myPeerId) return;
    log('got connect-me');
    initializePeer(peerId);
    connectPeer(hub, peerId, connId);
  });

  hub.subscribe(
    `no-you-connect-${myPeerId}`,
    ({peerId, connId, yourConnId}) => {
      if (peerId === myPeerId) return;
      log('got no-you-connect', s(peerId), {connId, yourConnId});
      initializePeer(peerId);
      if (yourConnId !== myConnId) {
        console.warn('no-you-connect to old connection, should be ignored');
        log('ignoring msg to old connection', yourConnId);
      } else {
        // only accept back-connection if connect request was made
        log('i initiate, but dont override if i already have a peer');
        // (because no-you-connect can only happen after i sent connect, at which point i couldn't have had peers,
        // so the peer i already have comes from a racing connect from the other peer)
        let {peers} = swarm;
        if (!peers[peerId]) {
          log('creating peer because i didnt have one');
          createPeer(peerId, connId, true);
        } else if (peers[peerId].connId !== connId) {
          log('creating peer because the connId was outdated');
          createPeer(peerId, connId, true);
        } else {
          log('not creating peer');
        }
      }
    }
  );

  hub.subscribe(`signal-${myPeerId}`, ({peerId, data, connId, yourConnId}) => {
    log('signal received from', s(peerId), connId, data.type);
    initializePeer(peerId);
    if (yourConnId !== myConnId) {
      console.warn('signal to old connection, should be ignored');
      log('ignoring msg to old connection', yourConnId);
      return;
    }
    let peer = swarm.peers[peerId];
    let {first, from} = data;
    let iAmActive = myPeerId > peerId;

    if (first && !iAmActive) {
      // this is the ONLY place a peer should ever be created by non-initiator
      log('I got the first signal and create a new peer to receive it');
      peer = createPeer(peerId, connId, false);
      peer.from = from;
    }

    if (!peer || peer.destroyed) {
      console.warn(
        'I received a signal without being in a valid state for any further action. Reconnecting!'
      );
      log('Signal data:', data);
      connectPeer(hub, peerId, connId);
      return;
    }

    if (!peer.from) {
      peer.from = from;
      if (!iAmActive) console.error('Something impossible happened');
    }

    // at this point we have peer && peer.from
    if (peer.from !== from) {
      console.warn('Ignoring signal from wrong peer instance.');
      return;
    }

    // from here on we are in the happy path
    addPeerMetaData(peer, data.meta);
    peer.signal(data);
    if (!(first && !iAmActive))
      addToTimeout(peer, MIN_MAX_CONNECT_TIME_AFTER_SIGNAL);
  });

  hub.subscribe('shared-state', ({peerId, state, authToken}) => {
    if (!swarm.verify || swarm.verify(state, authToken, peerId)) {
      swarm.sharedPeerState[peerId] = state;
      swarm.update('sharedPeerState');
    }
  });

  // TODO:
  // 1) need more general version of this channel
  // 2) need to communicate also to NEW clients
  hub.subscribe('mute-status', ({id, micMuted, authToken}) => {
    if (verifyToken(authToken, id)) {
      swarm.mutedPeers[id] = micMuted;
      swarm.update('mutedPeers');
    }
  });
}

function disconnect() {
  let {hub, peers} = swarm;
  if (hub) hub.close();
  swarm.hub = null;
  swarm.set('connected', false);
  for (let peerId in peers) {
    try {
      peers[peerId].destroy();
      removePeer(peerId);
    } catch (e) {}
  }
}

function reconnect() {
  disconnect();
  connect();
}

function randomHex4() {
  return ((Math.random() * 16 ** 4) | 0).toString(16).padStart(4, '0');
}

let s = id => id.slice(0, 2);

let log = LOGGING
  ? (...a) => {
      let d = new Date();
      let time = `[${d.toLocaleTimeString('de-DE')},${String(
        d.getMilliseconds()
      ).padStart(3, '0')}]`;
      console.log(time, ...a);
    }
  : () => {};
