const WebSocket = require('ws');
const querystring = require('querystring');
const {ssrVerifyToken} = require('../ssr');

// pub sub websocket

function broadcast(roomId, topic, message) {
  publish(roomId, topic, {t: topic, d: message});
}

function handleMessage(ws, roomId, msg) {
  // TODO: allow unsubscribe
  let {s: subscribeTopics, t: topic, d: data} = msg;
  if (subscribeTopics !== undefined) {
    subscribe(ws, roomId, subscribeTopics);
  }
  if (topic !== undefined) {
    publish(roomId, topic, {t: topic, d: data});
  }
}

let nConnections = 0;

function handleConnection(ws, req) {
  let {roomId, peerId, subs} = req;
  console.log('ws open', roomId, peerId, subs);

  addPeer(roomId, peerId);
  nConnections++;

  // inform every participant about new peer connection
  publish(roomId, 'add-peer', {t: 'add-peer', d: peerId});

  // auto subscribe to updates about connected peers
  subscribe(ws, roomId, ['add-peer', 'remove-peer', 'peers']);
  if (subs !== undefined) subscribe(ws, roomId, subs);

  // inform about peers immediately
  sendMessage(ws, {t: 'peers', d: getPeers(roomId)});

  ws.on('message', jsonMsg => {
    let msg = parseMessage(jsonMsg);
    // console.log('ws message', msg);
    if (msg !== undefined) handleMessage(ws, roomId, msg);
  });

  ws.on('close', (_code, _reason) => {
    // console.log('ws closed', code, reason);
    nConnections--;
    removePeer(roomId, peerId);
    unsubscribeAll(ws);

    publish(roomId, 'remove-peer', {t: 'remove-peer', d: peerId});

    // console.log('debug', roomPeerIds, subscriptions);
  });

  ws.on('error', error => {
    console.log('ws error', error);
  });
}

function activeUserCount() {
  return nConnections;
}

// ws server, handles upgrade requests for http server

function addWebsocket(server) {
  const wss = new WebSocket.Server({noServer: true});
  wss.on('connection', handleConnection);

  server.on('upgrade', (req, socket, head) => {
    let [path, query] = req.url.split('?');
    let [roomId] = path.split('/').filter(t => t);
    let params = querystring.parse(query);
    // console.log(path, params);
    // TODO make peerId = publicKey + ";" + sessionId
    let {id: peerId, subs, token} = params;
    if (
      peerId === undefined ||
      roomId === undefined ||
      !ssrVerifyToken(token, peerId)
    ) {
      console.log('ws rejected!', req.url, 'room', roomId, 'peer', peerId);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    req.peerId = peerId;
    req.roomId = roomId;
    req.subs = subs?.split(',').filter(t => t) ?? []; // custom encoding, don't use "," in topic names

    wss.handleUpgrade(req, socket, head, socket => {
      wss.emit('connection', socket, req);
    });
  });
}

module.exports = {addWebsocket, activeUserCount, broadcast};

// peer connections per room

const roomPeerIds = new Map(); // room => Set(peerId)

function addPeer(roomId, peerId) {
  let peerIds =
    roomPeerIds.get(roomId) ?? roomPeerIds.set(roomId, new Set()).get(roomId);
  peerIds.add(peerId);
}
function removePeer(roomId, peerId) {
  let peerIds = roomPeerIds.get(roomId);
  if (peerIds !== undefined) {
    peerIds.delete(peerId);
    if (peerIds.size === 0) roomPeerIds.delete(roomId);
  }
}
function getPeers(roomId) {
  let peerIds = roomPeerIds.get(roomId);
  if (peerIds === undefined) return [];
  return [...peerIds];
}

// pub sub

const subscriptions = new Map(); // "roomId/topic" => Set(ws)

function publish(room, topic, msg) {
  let key = `${room}/${topic}`;
  let subscribers = subscriptions.get(key);
  if (subscribers === undefined) return;
  for (let subscriber of subscribers) {
    sendMessage(subscriber, msg);
  }
}
function subscribe(ws, room, topics) {
  if (!(topics instanceof Array)) topics = [topics];
  for (let topic of topics) {
    let key = `${room}/${topic}`;
    let subscribers =
      subscriptions.get(key) ?? subscriptions.set(key, new Set()).get(key);
    subscribers.add(ws);
  }
}
function unsubscribeAll(ws) {
  for (let entry of subscriptions) {
    let [key, subscribers] = entry;
    subscribers.delete(ws);
    if (subscribers.size === 0) subscriptions.delete(key);
  }
}

// json

function parseMessage(jsonMsg) {
  try {
    return JSON.parse(jsonMsg);
  } catch (err) {
    console.log('ws: error parsing msg', jsonMsg);
    console.error(err);
    return;
  }
}

function sendMessage(ws, msg) {
  let jsonMsg;
  try {
    jsonMsg = JSON.stringify(msg);
  } catch (err) {
    console.log('ws: error stringifying', msg);
    console.error(err);
    return;
  }
  try {
    ws.send(jsonMsg);
    return true;
  } catch (err) {
    console.log('ws: error sending', jsonMsg);
    console.error(err);
    return false;
  }
}
