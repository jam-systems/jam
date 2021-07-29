import WebSocket from 'ws';
import {emit, on} from 'minimal-state';
import {jamHost} from './config.js';

export {sendRequest, sendDirect, onMessage, onRemovePeer, onAddPeer};

const eventEmitter = {opened: false};
const msgEmitter = {};
const subs = ['mediasoup'].join(',');
const url = `wss://${jamHost}/_/pantry/~forward?subs=${subs}&id=mediasoup`;
// const url = `ws://localhost:3001/~forward?subs=${subs}&id=mediasoup`;


let ws;
let hasOpened;
setInterval(() => {
  if (ws?.readyState === WebSocket.OPEN) return;
  try {
    createWebSocket();
  } catch (err) {
    console.log(err);
    console.log('retrying in 5 sec...');
  }
}, 5000);


function createWebSocket() {
  ws = new WebSocket(url, {rejectUnauthorized: false});
  hasOpened = new Promise(resolve => {
    ws.on('open', () => {
      resolve();
    });
  });
  ws.on('message', jsonMsg => {
    let msg = parseMessage(jsonMsg);
    if (msg !== undefined) handleMessage(msg);
  });
}

function handleMessage(msg) {
  let {ro: roomId, t: topic, d: data, p: senderId, r: requestId} = msg;

  switch (topic) {
    case 'add-peer':
    case 'remove-peer':
      emit(eventEmitter, topic, roomId, data);
      break;
    case 'response':
      requestAccepted(requestId, data);
      break;
    default: {
      let accept = requestId ? data => sendAccept(roomId, senderId, requestId, data) : () => {};
      emit(msgEmitter, topic, roomId, senderId, data, accept);
    }
  }
}


async function sendDirect(roomId, peerId, topic, data) {
  await hasOpened;
  sendMessage({t: topic, d: data, ro: roomId, p: peerId});
}

async function sendRequest(roomId, peerId, topic, data) {
  await hasOpened;
  let {id, promise} = newRequest();
  sendMessage({t: topic, d: data, ro: roomId, p: peerId, r: id});
  return promise;
}

async function sendAccept(roomId, peerId, requestId, data) {
  await hasOpened;
  return sendMessage({t: 'response', d: data, ro: roomId, p: peerId, r: requestId});
}

function onMessage(topic, listener) {
  return on(msgEmitter, topic, listener);
}
function onRemovePeer(listener) {
  return on(eventEmitter, 'remove-peer', listener);
}
function onAddPeer(listener) {
  return on(eventEmitter, 'add-peer', listener);
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

function sendMessage(msg) {
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

// request / response

const REQUEST_TIMEOUT = 20000;
const clientId = Math.random().toString(32).slice(2, 12);
const requests = new Map();

let nextRequestId = 0;

function newRequest(timeout = REQUEST_TIMEOUT) {
  let requestId = `${clientId};${nextRequestId++}`;
  const request = {id: requestId};
  request.promise = new Promise((resolve, reject) => {
    request.accept = data => {
      clearTimeout(request.timeout);
      resolve(data);
    };
    request.timeout = setTimeout(() => {
      reject(new Error('request timeout'));
    }, timeout);
  });
  requests.set(requestId, request);
  return request;
}

function requestAccepted(requestId, data) {
  let request = requests.get(requestId);
  if (request === undefined) return;
  request.accept(data);
  requests.delete(requestId);
}
