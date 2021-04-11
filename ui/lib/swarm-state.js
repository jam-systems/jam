import {update} from 'use-minimal-state';

export {updatePeerState, removePeerState};

function updatePeerState({swarm, peerId, connId}, fullState) {
  if (fullState === undefined) return;
  let {state, time} = fullState;
  let peerStates = get(swarm.connectionState, peerId, {});
  let states = get(peerStates, 'states', {});
  states[connId] = {state, time};
  reducePeerState(swarm, peerId);
  swarm.emit('rawPeerState', state, peerId, connId);
  update(swarm, 'connectionState');
  update(swarm.connectionState, peerId);
  update(swarm, 'peerState');
  update(swarm.peerState, peerId);
}

function removePeerState({swarm, peerId, connId}) {
  let peerStates = swarm.connectionState[peerId];
  if (peerStates === undefined) return;
  let {states} = peerStates;
  delete states[connId];
  if (Object.keys(states).length === 0) {
    delete swarm.connectionState[peerId];
    delete swarm.peerState[peerId];
  } else {
    reducePeerState(swarm, peerId);
  }
  update(swarm, 'connectionState');
  update(swarm.connectionState, peerId);
  update(swarm, 'peerState');
  update(swarm.peerState, peerId);
}

function reducePeerState(swarm, peerId) {
  let peerStates = swarm.connectionState[peerId];
  let {states} = peerStates;
  let latest = findLatest(states);
  peerStates.latest = latest;
  try {
    swarm.peerState[peerId] = swarm.reduceState(
      Object.values(states).map(s => s.state),
      swarm.peerState[peerId],
      states[latest]?.state
    );
  } catch (err) {
    console.error(err);
  }
}

function findLatest(states) {
  let latest, latestTime;
  for (let connId in states) {
    let {time} = states[connId];
    if (latestTime === undefined || time > latestTime) {
      latestTime = time;
      latest = connId;
    }
  }
  return latest;
}

function get(object, key, init) {
  let value = object[key];
  if (value === undefined) {
    value = init;
    object[key] = init;
  }
  return value;
}
