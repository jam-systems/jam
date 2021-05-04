import SimplePeer from './simple-peer-light';
import causalLog from './causal-log';
import debounce from './debounce';

const MAX_CONNECT_TIME = 6000;
const MAX_CONNECT_TIME_AFTER_ICE_DISCONNECT = 2000;
const MIN_MAX_CONNECT_TIME_AFTER_SIGNAL = 2000;
const MAX_FAIL_TIME = 20000;

export {
  newConnection,
  connectPeer,
  addStreamToPeer,
  handleSignal,
  handlePeerFail,
  log,
};

// connection:
// {swarm, peerId, connId, ...timeoutStuff, pc }

function newConnection({swarm, peerId, connId}) {
  return {swarm, peerId, connId, lastFailure: null};
}

const connectPeer = debounce(2000, connection => {
  // connect to a peer whose peerId & connId we already know
  // either after being pinged by connect-me or as a retry
  // SPEC:
  // -) this has to be callable by both peers without race conflict
  // -) this has to work in every state of swarm.peers (e.g. with or without existing Peer instance)
  let {swarm, peerId, connId} = connection;
  log('connecting peer', s(peerId), connId);
  if (swarm.hub === null) return;

  let {myPeerId, myConnId, sharedState, sharedStateTime} = swarm;
  // timeoutPeer(connection, MAX_CONNECT_TIME);
  if (myPeerId > peerId || (myPeerId === peerId && myConnId > connId)) {
    log('i initiate, and override any previous peer!');
    createPeer(connection, true);
  } else {
    log('i dont initiate, wait for first signal');
    swarm.hub.broadcast(`${peerId};${connId}`, {
      type: 'signal',
      state: {state: sharedState, time: sharedStateTime},
      data: {youStart: true, type: 'you-start'},
    });
    let {pc} = connection;
    if (pc) {
      log('destroying old peer', s(peerId));
      pc.garbage = true;
      pc.destroy();
    }
    log('sent you-start', s(peerId));
  }
});

function handleSignal(connection, {data}) {
  let {swarm, peerId, connId} = connection;
  let {myConnId, myPeerId} = swarm;
  if (data.youStart) {
    log('i initiate, but dont override if i already have a peer');
    // you-start is always ignored in the websocket case, but important in signalhub style
    // connections where a new peer does not have access to a list of already connected peers
    if (!connection.pc) {
      log('creating peer because i didnt have one');
      createPeer(connection, true);
    } else {
      // this means the other side can only connect a second time if
      // a.) their connId changed, b.) we destroyed the peerconnection
      // - so reconnection is only possible for the initiator
      // - which should be OK because ice disconnection is fired on both sides
      log('not creating peer');
    }
    return;
  }

  let peer = connection.pc;
  let {first, from} = data;
  let iAmActive =
    myPeerId > peerId || (myPeerId === peerId && myConnId > connId);

  if (first && !iAmActive) {
    // this is the ONLY place a peer should ever be created by non-initiator
    log('I got the first signal and create a new peer to receive it');
    peer = createPeer(connection, false);
    peer.from = from;
  }

  if (!peer || peer.destroyed) {
    console.warn(
      'I received a signal without being in a valid state for any further action. Reconnecting!'
    );
    log('Signal data:', data);
    connectPeer(connection);
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
    addToTimeout(connection, MIN_MAX_CONNECT_TIME_AFTER_SIGNAL);
}

function createPeer(connection, initiator) {
  let {swarm, peerId, connId} = connection;
  let {hub, localStreams, pcConfig} = swarm;
  // destroy any existing peer
  let peer = connection.pc;
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
  connection.pc = peer;

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
    let state;
    if (!peer.didSignal) {
      data.first = true;
      peer.didSignal = true;
      state = {state: swarm.sharedState, time: swarm.sharedStateTime};
    }
    hub.broadcast(`${peerId};${connId}`, {type: 'signal', data, state});
  });
  peer.on('connect', () => {
    log('connected peer', s(peerId), 'after', Date.now() - peer.connectStart);
    handlePeerSuccess(connection);
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
    swarm.update('stickyPeers');
  });

  peer.on('error', err => {
    if (peer.garbage) return;
    log('simplepeer error', err);
    let errCode = err?.code;
    if (
      errCode !== 'ERR_ICE_CONNECTION_FAILURE' &&
      errCode !== 'ERR_ICE_CONNECTION_CLOSED'
    ) {
      handlePeerFail(connection, true);
    }
  });
  peer.on('iceStateChange', state => {
    log('ice state', state);
    if (state === 'disconnected') {
      timeoutPeer(
        connection,
        MAX_CONNECT_TIME_AFTER_ICE_DISCONNECT,
        'peer timed out after ice disconnect'
      );
    }
    if (state === 'failed' || state === 'closed') {
      handlePeerFail(connection, false);
    }
    if (state === 'connected' || state === 'completed') {
      handlePeerSuccess(connection);
    }
  });
  peer.on('close', () => {
    if (peer.garbage) return;
    // handlePeerFail(connection);
  });
  return peer;
}

function timeoutPeer(connection, delay, message) {
  let now = Date.now();
  connection.lastFailure = connection.lastFailure || now; // TODO update problem indicators?
  clearTimeout(connection.timeout);
  delay = Math.max(0, (connection.timeoutEnd || 0) - now, delay);
  connection.timeoutEnd = now + delay;
  if (message) connection.timeoutMessage = message;
  connection.timeout = setTimeout(() => {
    log(connection.timeoutMessage || 'peer timed out');
    handlePeerFail(connection);
  }, delay);

  log('timeout peer in', delay);
}

function addToTimeout(connection, delay) {
  if (connection.timeout) timeoutPeer(connection, delay);
}

function stopTimeout(connection) {
  clearTimeout(connection.timeout);
  connection.timeout = null;
  connection.timeoutMessage = '';
  connection.timeoutEnd = 0;
}

function handlePeerSuccess(connection) {
  connection.lastFailure = null; // TODO update problem indicators?
  stopTimeout(connection);
}

function handlePeerFail(connection, forcedFail) {
  // peer either took too long to fire 'connect', or fired an error-like event
  // depending how long we already tried, either reconnect or remove peer
  stopTimeout(connection);
  let now = Date.now();
  connection.lastFailure = connection.lastFailure || now;
  let failTime = now - connection.lastFailure;

  log('handle peer fail! time failing:', failTime);

  if (forcedFail === true || failTime > MAX_FAIL_TIME) {
    connection.swarm.emit('failedConnection', connection);
  } else {
    connectPeer(connection);
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
function addStreamToPeer(connection, stream, name) {
  let peer = connection.pc;
  if (peer === undefined || peer.destroyed) return;
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
  log('adding stream to', s(peer.peerId), name);
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
        console.error('could not add stream to peer', peer.peerId);
        console.error(err);
      }
    }
  }
}

let s = id => id.slice(0, 2);

function log(...args) {
  if (!window.DEBUG) return;
  let d = new Date();
  let time = `[${d.toLocaleTimeString('de-DE')},${String(
    d.getMilliseconds()
  ).padStart(3, '0')}]`;
  causalLog(time, ...args);
}
