import SimplePeer from 'simple-peer-light';
import State from './minimal-state.js';
import signalhub from './signalhub.js';
import {verifyToken} from './identity';

const LOGGING = true;
const MAX_CONNECT_TIME = 4000;
const MAX_FAIL_TIME = 24000;

// public API starts here

const swarm = State({
  // state
  peers: {},
  stickyPeerInfo: {}, // peerId: {failTime: number, hadStream: boolean, inRoom: boolean}
  myPeerId: null,
  connected: false,
  remoteStreams: [], // {stream, name, peerId}, only one per (name, peerId) if name is set
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

swarm.config = (signalhubUrl, room) => {
  swarm.url = signalhubUrl;
  swarm.room = room;
};

swarm.connect = connect;
swarm.disconnect = disconnect;
swarm.reconnect = reconnect;

swarm.addLocalStream = (stream, name) => {
  log('addlocalstream', stream, name);
  if (!name) name = randomHex4();
  swarm.localStreams[name] = stream;
  addStreamToPeers(stream, name);
};

// public API ends here

let log = LOGGING ? console.log : () => {};

function createPeer(peerId, connId, initiator) {
  let {hub, localStreams, peers, myPeerId} = swarm;
  if (!myPeerId || peerId === myPeerId) return;
  // destroy any existing peer
  let peer = peers[peerId];
  if (peer) {
    log('destroying old peer', peerId);
    peer.destroy();
  }
  log('creating peer', peerId, connId);

  let streams = Object.values(localStreams).filter(x => x);
  peer = new SimplePeer({
    initiator,
    config: {
      iceTransportPolicy: 'relay',
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

  peer.createdAt = Date.now();
  peer.timeout = setTimeout(() => {
    log('peer timed out');
    peer.timeout = null;
    handlePeerFail(peer, MAX_CONNECT_TIME);
  }, MAX_CONNECT_TIME);

  peer.on('signal', data => {
    log('signaling to', peerId, connId, data.type);
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
    hub.broadcast(`signal-${peerId}`, {
      peerId: myPeerId,
      connId: hub.connId,
      yourConnId: connId,
      data,
    });
  });
  peer.on('connect', () => {
    log('connected peer', peerId, 'after', Date.now() - peer.createdAt);
    clearTimeout(peer.timeout);
    peer.timeout = null;
    swarm.stickyPeerInfo[peerId].failTime = 0;
    swarm.update('peers');
  });

  peer.on('data', rawData => {
    log('data (channel) from', peerId);
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
    log('error', err);
  });
  peer.on('iceStateChange', iceConnectionState => {
    log('ice state', iceConnectionState);
    if (iceConnectionState === 'disconnected') {
      // we treat this like a reconnect for now
      clearTimeout(peer.timeout);
      peer.timeout = setTimeout(() => {
        log('peer timed out after ice disconnect');
        peer.timeout = null;
        handlePeerFail(peer, MAX_CONNECT_TIME);
      }, MAX_CONNECT_TIME);
    }
  });
  peer.on('close', () => {
    let thisFailTime = 0;
    if (peer.timeout) {
      thisFailTime = Date.now() - peer.createdAt;
      clearTimeout(peer.timeout);
      peer.timeout = null;
    }
    handlePeerFail(peer, thisFailTime);
  });
  return peer;
}

function handlePeerFail(peer, thisFailTime) {
  // peer either took too long to fire 'connect', or fired an error-like event
  // depending how long we already tried, either reconnect or remove peer
  let {peerId, connId} = peer;
  let {peers, stickyPeerInfo, hub} = swarm;

  let info = stickyPeerInfo[peer.peerId];
  info.failTime += thisFailTime;

  // don't break anything if we already replaced this peer instance
  if (peers[peerId] !== peer) return;

  log('handle peer fail!', thisFailTime, info.failTime);

  if (info.failTime > MAX_FAIL_TIME) {
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
  console.log('removing peer', peerId);
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
      log('adding stream to', peerId, name);
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
      failTime: 0,
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
  log('connecting peer', peerId, connId);
  let {myPeerId} = swarm;
  if (myPeerId > peerId) {
    log('i initiate, and override any previous peer!');
    createPeer(peerId, connId, true);
  } else {
    log('i dont initiate, but will prepare a new peer');
    hub.broadcast(`no-you-connect-${peerId}`, {
      peerId: myPeerId,
      connId: hub.connId,
      yourConnId: connId,
    });
    log('sent no-you-connect', peerId);
    createPeer(peerId, connId, false);
  }
}

function connect() {
  // don't auto-reconnect (fixes hot reloading!)
  if (swarm.hub) return;
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
      log('got no-you-connect', peerId, {peerId, connId, yourConnId});
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
    log('signal received from', peerId, connId, data.type);
    initializePeer(peerId);
    if (yourConnId !== myConnId) {
      console.warn('signal to old connection, should be ignored');
      log('ignoring msg to old connection', yourConnId);
      return;
    }
    let peer = swarm.peers[peerId];
    if (peer && !peer.destroyed) {
      addPeerMetaData(peer, data.meta);
      peer.signal(data);
    } else {
      log('no peer to receive signal');
      if (data && data.type === 'offer') {
        log('i got an offer and will create a new peer to receive it');
        peer = createPeer(peerId, connId, false);
        addPeerMetaData(peer, data.meta);
        peer.signal(data);
      }
      if (data && data.type !== 'offer') {
        log(
          'UH-OH! received signal other than offer & no peer yet:',
          data.type
        );
      }
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
