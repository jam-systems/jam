import SimplePeer from 'simple-peer-light';
import State from 'use-minimal-state';
import {authenticatedHub} from './signalhub.js';

const MAX_CONNECT_TIME = 6000;
const MAX_CONNECT_TIME_AFTER_ICE_DISCONNECT = 2000;
const MIN_MAX_CONNECT_TIME_AFTER_SIGNAL = 2000;
const MAX_FAIL_TIME = 20000;

// public API starts here

const swarm = State({
  // state
  stickyPeers: {}, // {peerId: {lastFailure: number, hadStream: boolean}}
  myPeerId: null,
  connected: false,
  remoteStreams: [], // [{stream, name, peerId}], only one per (name, peerId) if name is set
  peerState: {}, // {peerId: sharedState}
  sharedState: null, // my portion of peerState, gets shared on update and on peer join
  // shared peer state can be authenticated by passing sign / verify functions to config()
  // internal
  peers: {},
  url: '',
  room: '',
  debug: false,
  hub: null,
  localStreams: {},
  // events
  stream: null,
  data: null,
  newPeer: null,
  sharedEvent: null,
  peerEvent: null,
});

export default swarm;

function config({url, room, myPeerId, sign, verify, pcConfig, debug}) {
  if (url) swarm.url = url;
  if (room) swarm.room = room;
  if (myPeerId) swarm.myPeerId = myPeerId;
  if (sign) swarm.sign = sign; // sign(state): string
  if (verify) swarm.verify = verify; // verify(signedState, peerId): state | undefined
  if (pcConfig) swarm.pcConfig = pcConfig;
  if (debug) swarm.debug = debug;
}

// TODO FIXME: the fact that this function can CHANGE the stream that's given to it
// is an awful hack that destroys the intended encapsulation of this module
// for reference: https://github.com/feross/simple-peer/issues/606
// should be possible with cloning + (replaceTrack or addTrack, depending on whether a track exists)
function addLocalStream(stream, name, onNewStream) {
  log('addlocalstream', stream, name);
  if (!name) name = randomHex4();
  swarm.localStreams[name] = stream;
  try {
    addStreamToPeers(stream, name);
  } catch (err) {
    console.log('cloning tracks');
    // clone tracks to handle error on removing and readding the same stream
    let clonedTracks = stream.getTracks().map(t => t.clone());
    let clonedStream = new MediaStream(clonedTracks);
    // we have to re-add that cloned stream and notify caller
    swarm.localStreams[name] = clonedStream;
    addStreamToPeers(clonedStream, name);
    onNewStream?.(clonedStream);
  }
}

swarm.on('sharedState', data => {
  let {hub, myPeerId} = swarm;
  if (!hub || !myPeerId) return;
  hub.broadcast('all', {
    type: 'shared-state',
    peerId: myPeerId,
    data,
  });
});

swarm.on('sharedEvent', data => {
  let {hub, myPeerId} = swarm;
  if (!hub || !myPeerId) return;
  hub.broadcast('all', {
    type: 'shared-event',
    peerId: myPeerId,
    data,
  });
});

export {config, connect, disconnect, reconnect, addLocalStream};

swarm.config = config;
swarm.connect = connect;
swarm.disconnect = disconnect;
swarm.reconnect = reconnect;
swarm.addLocalStream = addLocalStream;

// public API ends here

function createPeer(peerId, connId, initiator) {
  let {hub, localStreams, peers, myPeerId, pcConfig} = swarm;
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
    config: pcConfig || undefined,
    trickle: true,
    streams,
    // debug: true,
  });
  peer.peerId = peerId;
  peer.connId = connId;
  peer.streams = {...localStreams};
  peers[peerId] = peer;

  peer.connectStart = Date.now();
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
    let sharedState;
    if (!peer.didSignal) {
      data.first = true;
      peer.didSignal = true;
      sharedState = swarm.sharedState;
    }
    hub.broadcast(`signal-${peerId}`, {
      peerId: myPeerId,
      connId: hub.connId,
      yourConnId: connId,
      data,
      sharedState,
    });
  });
  peer.on('connect', () => {
    log('connected peer', s(peerId), 'after', Date.now() - peer.connectStart);
    handlePeerSuccess(peerId);
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
    swarm.stickyPeers[peerId].hadStream = true;
    swarm.update('stickyPeers');
  });

  peer.on('error', err => {
    if (peers[peerId] !== peer || peer.garbage) return;
    log('error', err);
  });
  peer.on('iceStateChange', state => {
    log('ice state', state);
    if (state === 'disconnected') {
      timeoutPeer(
        peerId,
        MAX_CONNECT_TIME_AFTER_ICE_DISCONNECT,
        'peer timed out after ice disconnect'
      );
    }
    if (state === 'connected' || state === 'completed') {
      handlePeerSuccess(peerId);
    }
  });
  peer.on('close', () => {
    if (peers[peerId] !== peer || peer.garbage) return;
    handlePeerFail(peerId);
  });
  return peer;
}

function timeoutPeer(peerId, delay, message) {
  let peer = swarm.stickyPeers[peerId];
  let now = Date.now();
  peer.lastFailure = peer.lastFailure || now; // TODO update problem indicators?
  clearTimeout(peer.timeout);
  delay = Math.max(0, (peer.timeoutEnd || 0) - now, delay);
  peer.timeoutEnd = now + delay;
  if (message) peer.timeoutMessage = message;
  peer.timeout = setTimeout(() => {
    log(peer.timeoutMessage || 'peer timed out');
    handlePeerFail(peerId);
  }, delay);

  log('timeout peer in', delay);
}

function addToTimeout(peerId, delay) {
  let peer = swarm.stickyPeers[peerId];
  if (peer.timeout) timeoutPeer(peerId, delay);
}

function stopTimeout(peerId) {
  let peer = swarm.stickyPeers[peerId];
  clearTimeout(peer.timeout);
  peer.timeout = null;
  peer.timeoutMessage = '';
  peer.timeoutEnd = 0;
}

function handlePeerSuccess(peerId) {
  let peer = swarm.stickyPeers[peerId];
  peer.lastFailure = null; // TODO update problem indicators?
  stopTimeout(peerId);
}

function handlePeerFail(peerId) {
  // peer either took too long to fire 'connect', or fired an error-like event
  // depending how long we already tried, either reconnect or remove peer
  let {stickyPeers, hub} = swarm;
  stopTimeout(peerId);

  let peer = stickyPeers[peerId];
  let now = Date.now();
  peer.lastFailure = peer.lastFailure || now;
  let failTime = now - peer.lastFailure;

  log('handle peer fail! time failing:', failTime);

  if (failTime > MAX_FAIL_TIME) {
    delete stickyPeers[peerId];
    swarm.update('stickyPeers');
    removePeer(peerId);
  } else {
    connectPeer(hub, peerId, peer.connId);
  }
}

function removePeer(peerId) {
  let {peers} = swarm;
  log('removing peer', s(peerId));
  delete peers[peerId];
  let {remoteStreams} = swarm;
  if (remoteStreams.find(streamObj => streamObj.peerId === peerId)) {
    swarm.set(
      'remoteStreams',
      remoteStreams.filter(streamObj => streamObj.peerId !== peerId)
    );
  }
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
    if (oldStream && oldStream === stream) return; // avoid error if listener is called twice
    if (oldStream) {
      try {
        // avoid TypeError: this._senderMap is null
        peer.removeStream(oldStream);
      } catch (err) {
        console.warn(err);
      }
    }
    log('adding stream to', s(peerId), name);
    peer.streams[name] = stream;
    if (stream) {
      try {
        peer.addStream(stream);
      } catch (err) {
        peer.streams[name] = null;
        throw err;
      }
    }
  }
}

function updatePeerState(peerId, state) {
  swarm.peerState[peerId] = state;
  swarm.update('peerState');
}

function initializePeer(peerId, connId, sharedState) {
  let {stickyPeers} = swarm;
  if (!stickyPeers[peerId]) {
    stickyPeers[peerId] = {
      hadStream: false,
      lastFailure: null,
    };
    swarm.update('stickyPeers');
    swarm.emit('newPeer', peerId);
  }
  stickyPeers[peerId].connId = connId;
  if (sharedState) updatePeerState(peerId, sharedState);
}

function connectPeer(hub, peerId, connId) {
  // connect to a peer whose peerId & connId we already know
  // either after being pinged by connect-me or as a retry
  // SPEC:
  // -) this has to be callable by both peers without race conflict
  // -) this has to work in every state of swarm.peers (e.g. with or without existing Peer instance)
  log('connecting peer', s(peerId), connId);
  timeoutPeer(peerId, MAX_CONNECT_TIME);
  let {myPeerId, peers, sharedState} = swarm;
  if (myPeerId > peerId) {
    log('i initiate, and override any previous peer!');
    createPeer(peerId, connId, true);
  } else {
    log('i dont initiate, wait for first signal');
    hub.broadcast(`no-you-connect-${peerId}`, {
      peerId: myPeerId,
      connId: hub.connId,
      yourConnId: connId,
      sharedState,
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

function connect(room) {
  if (swarm.hub) return;
  swarm.config({room});
  if (!swarm.room || !swarm.url) {
    return console.error(
      'Must call swarm.config({url, room}) before connecting!'
    );
  }
  let myConnId = randomHex4();
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
    .broadcast('connect-me', {
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

  hub.connId = myConnId;
  swarm.hub = hub;

  hub.subscribe('connect-me', ({peerId, connId, sharedState}) => {
    if (peerId === myPeerId) return;
    log('got connect-me');
    initializePeer(peerId, connId, sharedState);
    connectPeer(hub, peerId, connId);
  });

  hub.subscribe(
    `no-you-connect-${myPeerId}`,
    ({peerId, connId, yourConnId, sharedState}) => {
      if (peerId === myPeerId) return;
      log('got no-you-connect', s(peerId), {connId, yourConnId});
      initializePeer(peerId, connId, sharedState);
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

  hub.subscribe(
    `signal-${myPeerId}`,
    ({peerId, data, connId, yourConnId, sharedState}) => {
      log('signal received from', s(peerId), connId, data.type);
      initializePeer(peerId, connId, sharedState);
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
        addToTimeout(peerId, MIN_MAX_CONNECT_TIME_AFTER_SIGNAL);
    }
  );

  hub.subscribe('all', ({type, peerId, data}) => {
    if (type === 'shared-state') {
      updatePeerState(peerId, data);
    }
    if (type === 'shared-event') {
      swarm.emit('peerEvent', peerId, data);
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

let log = (...a) => {
  if (!swarm.debug) return;
  let d = new Date();
  let time = `[${d.toLocaleTimeString('de-DE')},${String(
    d.getMilliseconds()
  ).padStart(3, '0')}]`;
  console.log(time, ...a);
};
