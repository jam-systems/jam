import {emit, update} from 'use-minimal-state';

export {updatePeerState, removePeerState};

function updatePeerState({swarm, peerId, connId}, fullState) {
  if (fullState === undefined) return;
  let {state, time} = fullState;
  let peerStates = get(swarm.connectionState, peerId, {});
  let states = get(peerStates, 'states', {});
  states[connId] = {state, time};
  reducePeerState(swarm, peerId);
  emit(swarm, 'rawPeerState', state, peerId, connId);
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
  let {latestId, latestState} = findLatest(states);
  peerStates.latest = latestId;
  try {
    swarm.peerState[peerId] = swarm.reduceState(
      Object.values(states).map(s => s.state),
      swarm.peerState[peerId],
      latestState,
      filter => findLatest(states, filter)?.latestState
    );
  } catch (err) {
    console.error(err);
  }
}

function findLatest(states, filter) {
  let latestId, latestTime, latestState;
  for (let connId in states) {
    let {state, time} = states[connId];
    if (
      (latestTime === undefined || time > latestTime) &&
      (filter === undefined || filter(state))
    ) {
      latestTime = time;
      latestState = state;
      latestId = connId;
    }
  }
  return {latestId, latestState};
}

function get(object, key, init) {
  let value = object[key];
  if (value === undefined) {
    value = init;
    object[key] = init;
  }
  return value;
}
