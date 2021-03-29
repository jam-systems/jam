import SimplePeer from './simple-peer-light';
import causalLog from './causal-log';
import {DEV} from '../logic/config';

const MAX_CONNECT_TIME = 6000;
const MAX_CONNECT_TIME_AFTER_ICE_DISCONNECT = 2000;
const MIN_MAX_CONNECT_TIME_AFTER_SIGNAL = 2000;
const MAX_FAIL_TIME = 20000;

let _debug = DEV;

export {createPeer, removePeer, addStreamToPeer, connectPeer, handleSignal};

function createPeer(swarm, peerId, connId, initiator) {
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
    handlePeerSuccess(swarm, peerId);
  });

  peer.on('data', rawData => {
    log('data (channel) from', s(peerId));
    swarm.emit('data', rawData);
  });

  peer.on('track', (track, stream) => {
    log('onTrack', track, stream);
    let name = peer.remoteStreamIds?.find(([, id]) => id === stream.id)?.[0];
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
        swarm,
        peerId,
        MAX_CONNECT_TIME_AFTER_ICE_DISCONNECT,
        'peer timed out after ice disconnect'
      );
    }
    if (state === 'connected' || state === 'completed') {
      handlePeerSuccess(swarm, peerId);
    }
  });
  peer.on('close', () => {
    if (peers[peerId] !== peer || peer.garbage) return;
    handlePeerFail(swarm, peerId);
  });
  return peer;
}

function handleSignal(swarm, {connId, yourConnId, peerId, data}) {
  let {connId: myConnId, myPeerId, hub} = swarm;
  if (yourConnId !== myConnId) {
    console.warn('signal to old connection, should be ignored');
    log('ignoring msg to old connection', yourConnId);
    return;
  }

  if (data.youStart) {
    // only accept back-connection if connect request was made
    log('i initiate, but dont override if i already have a peer');
    // (because no-you-connect can only happen after i sent connect, at which point i couldn't have had peers,
    // so the peer i already have comes from a racing connect from the other peer)
    let {peers} = swarm;
    if (!peers[peerId]) {
      log('creating peer because i didnt have one');
      createPeer(swarm, peerId, connId, true);
    } else if (peers[peerId].connId !== connId) {
      log('creating peer because the connId was outdated');
      createPeer(swarm, peerId, connId, true);
    } else {
      log('not creating peer');
    }
  }

  let peer = swarm.peers[peerId];
  let {first, from} = data;
  let iAmActive = myPeerId > peerId;

  if (first && !iAmActive) {
    // this is the ONLY place a peer should ever be created by non-initiator
    log('I got the first signal and create a new peer to receive it');
    peer = createPeer(swarm, peerId, connId, false);
    peer.from = from;
  }

  if (!peer || peer.destroyed) {
    console.warn(
      'I received a signal without being in a valid state for any further action. Reconnecting!'
    );
    log('Signal data:', data);
    connectPeer(swarm, hub, peerId, connId);
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
    addToTimeout(swarm, peerId, MIN_MAX_CONNECT_TIME_AFTER_SIGNAL);
}

function timeoutPeer(swarm, peerId, delay, message) {
  let peer = swarm.stickyPeers[peerId];
  let now = Date.now();
  peer.lastFailure = peer.lastFailure || now; // TODO update problem indicators?
  clearTimeout(peer.timeout);
  delay = Math.max(0, (peer.timeoutEnd || 0) - now, delay);
  peer.timeoutEnd = now + delay;
  if (message) peer.timeoutMessage = message;
  peer.timeout = setTimeout(() => {
    log(peer.timeoutMessage || 'peer timed out');
    handlePeerFail(swarm, peerId);
  }, delay);

  log('timeout peer in', delay);
}

function addToTimeout(swarm, peerId, delay) {
  let peer = swarm.stickyPeers[peerId];
  if (peer.timeout) timeoutPeer(swarm, peerId, delay);
}

function stopTimeout(swarm, peerId) {
  let peer = swarm.stickyPeers[peerId];
  clearTimeout(peer.timeout);
  peer.timeout = null;
  peer.timeoutMessage = '';
  peer.timeoutEnd = 0;
}

function handlePeerSuccess(swarm, peerId) {
  let peer = swarm.stickyPeers[peerId];
  peer.lastFailure = null; // TODO update problem indicators?
  stopTimeout(swarm, peerId);
}

function handlePeerFail(swarm, peerId) {
  // peer either took too long to fire 'connect', or fired an error-like event
  // depending how long we already tried, either reconnect or remove peer
  let {stickyPeers, hub} = swarm;
  stopTimeout(swarm, peerId);

  let peer = stickyPeers[peerId];
  let now = Date.now();
  peer.lastFailure = peer.lastFailure || now;
  let failTime = now - peer.lastFailure;

  log('handle peer fail! time failing:', failTime);

  if (failTime > MAX_FAIL_TIME) {
    removePeer(swarm, peerId);
  } else {
    connectPeer(swarm, hub, peerId, peer.connId);
  }
}

function removePeer(swarm, peerId) {
  let {peers, stickyPeers} = swarm;
  log('removing peer', s(peerId));
  delete stickyPeers[peerId];
  swarm.update('stickyPeers');
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

// TODO: replaceTrack is less invasive than removeTrack + addTrack,
// use it if both old and new tracks exist?
// for reference: https://github.com/feross/simple-peer/issues/606
function addStreamToPeer(swarm, peerId, stream, name) {
  let peer = swarm.peers[peerId];
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
      if (err.code) {
        throw err;
      } else {
        // TODO "this._senderMap is null", investigate if this happens in relevant cases
        console.error('could not add stream to peer', peerId);
        console.error(err);
      }
    }
  }
}

function connectPeer(swarm, hub, peerId, connId) {
  // connect to a peer whose peerId & connId we already know
  // either after being pinged by connect-me or as a retry
  // SPEC:
  // -) this has to be callable by both peers without race conflict
  // -) this has to work in every state of swarm.peers (e.g. with or without existing Peer instance)
  log('connecting peer', s(peerId), connId);
  timeoutPeer(swarm, peerId, MAX_CONNECT_TIME);
  let {myPeerId, peers, sharedState} = swarm;
  if (myPeerId > peerId) {
    log('i initiate, and override any previous peer!');
    createPeer(swarm, peerId, connId, true);
  } else {
    log('i dont initiate, wait for first signal');
    hub.broadcast(`signal-${peerId}`, {
      peerId: myPeerId,
      connId: hub.connId,
      yourConnId: connId,
      sharedState,
      data: {youStart: true, type: 'you-start'},
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

let s = id => id.slice(0, 2);

let debug = doDebug => {
  _debug = doDebug;
};

let log = (...a) => {
  if (!_debug) return;
  let d = new Date();
  let time = `[${d.toLocaleTimeString('de-DE')},${String(
    d.getMilliseconds()
  ).padStart(3, '0')}]`;
  causalLog(time, ...a);
};
