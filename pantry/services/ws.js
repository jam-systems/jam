const WebSocket = require('ws');

// pub sub websocket

function handleMessage(ws, msg) {
  let {s: subscribeTopic, p: publishTopic, d: data} = msg;
  if (subscribeTopic !== undefined) {
    if (subscribeTopic instanceof Array) {
      for (let topic of subscribeTopic) {
        subscribe(ws, topic);
      }
    } else {
      subscribe(ws, subscribeTopic);
    }
  }
  if (publishTopic !== undefined) {
    publish(ws, publishTopic, {p: publishTopic, d: data});
  }
}

function handleClose(ws) {
  unsubscribeAll(ws);
}

let nConnections = 0;

function handleConnection(ws, _req) {
  // could also use request here for auth
  nConnections++;
  ws.on('message', jsonMsg => {
    let msg = parseMessage(jsonMsg);
    // console.log('ws message', msg);
    if (msg !== undefined) handleMessage(ws, msg);
  });
  ws.on('close', (_code, _reason) => {
    // console.log('ws closed', code, reason);
    nConnections--;
    handleClose(ws);
  });
  ws.on('error', error => {
    console.log('ws error', error);
  });
}

function countConnections() {
  return nConnections;
}

// ws server

function addWebsocket(server) {
  const wss = new WebSocket.Server({noServer: true});
  wss.on('connection', handleConnection);
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, socket => {
      wss.emit('connection', socket, request);
    });
  });
}

module.exports = {addWebsocket, countConnections};

// pub sub

const subscriptions = new Map();

function publish(_ws, topic, msg) {
  let subscribers =
    subscriptions.get(topic) || subscriptions.set(topic, new Set()).get(topic);
  for (let subscriber of subscribers) {
    sendMessage(subscriber, msg);
  }
}
function subscribe(ws, topic) {
  let subscribers =
    subscriptions.get(topic) || subscriptions.set(topic, new Set()).get(topic);
  subscribers.add(ws);
}
function unsubscribeAll(ws) {
  for (let entry of subscriptions) {
    let [, subscribers] = entry;
    subscribers.delete(ws);
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
