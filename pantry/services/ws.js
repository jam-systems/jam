const WebSocket = require('ws');
const querystring = require('querystring');
const {get} = require('../services/redis');
const {ssrVerifyToken} = require('../ssr');

// pub sub websocket

const reservedTopics = ['server', 'peers', 'add-peer', 'remove-peer'];

function broadcast(roomId, topic, message) {
  publish(roomId, 'server', {t: 'server', d: {t: topic, d: message}});
}

async function handleMessage(connection, roomId, msg) {
  // TODO: allow unsubscribe
  let {s: subscribeTopics, t: topic, d: data} = msg;
  let senderId = connection.peerId;
  if (subscribeTopics !== undefined) {
    subscribe(connection, roomId, subscribeTopics);
  }

  if (topic === undefined || reservedTopics.includes(topic)) return;

  switch (topic) {
    // special topics (not subscribable; sender decides who gets msg)
    case 'direct': {
      // send to one specific peer
      let {p: receiverId} = msg;
      let receiver = getConnections(roomId).find(c => c.peerId === receiverId);
      if (receiver !== undefined) {
        sendMessage(receiver, {t: 'direct', d: data, p: senderId});
      }
      break;
    }
    case 'moderator': {
      // send to all mods
      let outgoingMsg = {t: 'direct', d: data, p: senderId};
      let {moderators = []} = (await get('rooms/' + roomId)) ?? {};
      for (let receiver of getConnections(roomId)) {
        if (moderators.includes(getPublicKey(receiver))) {
          sendMessage(receiver, outgoingMsg);
        }
      }
      break;
    }
    default:
      // normal topic that everyone can subscribe
      publish(roomId, topic, {t: topic, d: data, p: senderId});
  }
}

let nConnections = 0;

function handleConnection(ws, req) {
  let {roomId, peerId, subs} = req;
  console.log('ws open', roomId, peerId, subs);

  const connection = {ws, peerId};

  addPeer(roomId, connection);
  nConnections++;

  // inform every participant about new peer connection
  publish(roomId, 'add-peer', {t: 'add-peer', d: peerId});

  // auto subscribe to updates about connected peers
  subscribe(connection, roomId, reservedTopics);
  if (subs !== undefined) subscribe(connection, roomId, subs);

  // inform about peers immediately
  sendMessage(ws, {t: 'peers', d: getPeers(roomId)});

  ws.on('message', jsonMsg => {
    let msg = parseMessage(jsonMsg);
    // console.log('ws message', msg);
    if (msg !== undefined) handleMessage(connection, roomId, msg);
  });

  ws.on('close', (_code, _reason) => {
    // console.log('ws closed', code, reason);
    nConnections--;
    removePeer(roomId, peerId);
    unsubscribeAll(connection);

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
    let {id: peerId, subs, token} = params;
    let publicKey = peerId?.split(';')[0];
    if (
      peerId === undefined ||
      roomId === undefined ||
      !ssrVerifyToken(token, publicKey)
    ) {
      console.log('ws rejected!', req.url, 'room', roomId, 'peer', peerId);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    req.peerId = peerId;
    req.roomId = roomId;
    req.subs = subs?.split(',').filter(t => t) ?? []; // custom encoding, don't use "," in topic names

    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit('connection', ws, req);
    });
  });
}

module.exports = {addWebsocket, activeUserCount, broadcast};

// connection = {ws, peerId}

function getPublicKey({peerId}) {
  return peerId.split(';')[0];
}

// peer connections per room

const roomConnections = new Map(); // room => Set(connection)

function addPeer(roomId, connection) {
  let connections =
    roomConnections.get(roomId) ??
    roomConnections.set(roomId, new Set()).get(roomId);
  connections.add(connection);
}
function removePeer(roomId, connection) {
  let connections = roomConnections.get(roomId);
  if (connections !== undefined) {
    connections.delete(connection);
    if (connections.size === 0) roomConnections.delete(roomId);
  }
}
function getConnections(roomId) {
  let connections = roomConnections.get(roomId);
  if (connections === undefined) return [];
  return [...connections];
}
function getPeers(roomId) {
  return getConnections(roomId).map(c => c.peerId);
}

// pub sub

const subscriptions = new Map(); // "roomId/topic" => Set(connection)

function publish(room, topic, msg) {
  let key = `${room}/${topic}`;
  let subscribers = subscriptions.get(key);
  if (subscribers === undefined) return;
  for (let subscriber of subscribers) {
    sendMessage(subscriber, msg);
  }
}
function subscribe(connection, room, topics) {
  if (!(topics instanceof Array)) topics = [topics];
  for (let topic of topics) {
    let key = `${room}/${topic}`;
    let subscribers =
      subscriptions.get(key) ?? subscriptions.set(key, new Set()).get(key);
    subscribers.add(connection);
  }
}
function unsubscribeAll(connection) {
  for (let entry of subscriptions) {
    let [key, subscribers] = entry;
    subscribers.delete(connection);
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

function sendMessage({ws}, msg) {
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
