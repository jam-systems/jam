import {emit, on} from 'use-minimal-state';

export default function signalws({url, roomId, myPeerId, subscriptions = []}) {
  if (!url) throw new Error('signaling url required');
  if (!roomId) throw new Error('room id required');
  if (!myPeerId) throw new Error('peer id required');

  url = url.indexOf('://') === -1 ? 'wss://' + url : url;
  url = url.replace('http', 'ws');
  if (!url.endsWith('/')) url += '/';
  url += `${roomId}?id=${myPeerId}&subs=${subscriptions.join(',')}`;

  let ws = new WebSocket(url);

  ws.addEventListener('message', ({data}) => {
    console.log('ws message', data);
    let msg = decode(data);
    if (msg === undefined) return;
    let {t: topic, d} = msg;
    emit(hub, topic, d);
  });

  const hub = {
    ws,
    subs: subscriptions,
    subscribe(topic, onMessage) {
      subscribe(hub, topic, onMessage);
    },
    broadcast(topic, message = {}) {
      broadcast(hub, topic, message);
    },
    broadcastAnonymous: (...args) => hub.broadcast(...args),
    subscribeAnonymous: (...args) => hub.subscribe(...args),
    close() {
      close(hub);
    },
  };
  return hub;
}

function subscribe(hub, topic, onMessage) {
  let {ws, subs} = hub;
  if (!subs.includes(topic)) {
    subs.push(topic);
    let send = () => ws.send(JSON.stringify({s: topic}));
    if (ws.readyState === WebSocket.OPEN) {
      send();
    } else {
      ws.addEventListener('open', send);
    }
  }
  return on(hub, topic, data => onMessage(data));
  // TODO: send unsubscribe msg on unsubscribing
}

function broadcast({ws}, topic, message) {
  ws.send(JSON.stringify({t: topic, d: message}));
}

function close({ws}) {
  ws.close(1000);
}

function decode(data) {
  try {
    return JSON.parse(data);
  } catch (err) {
    return undefined;
  }
}
