import swarm from '../lib/swarm';
import state from './state';
import {get, updateApiQuery, put, useApiQuery} from './backend';
import {on, set, update} from 'use-minimal-state';
import identity from './identity';

export {
  useRoom,
  maybeConnectRoom,
  disconnectRoom,
  addRole,
  removeRole,
  leaveStage,
  emptyRoom,
};

let _disconnectRoom = null;

function useRoom(roomId) {
  return useApiQuery(`/rooms/${roomId}`, !!roomId, 'room', emptyRoom);
}

function maybeConnectRoom(roomId) {
  if (swarm.room === roomId && swarm.hub) return;
  console.log('connecting room', roomId);
  set(state, 'roomId', roomId);
  if (swarm.hub) swarm.disconnect();
  swarm.connect(roomId);
  swarm.hub.subscribe('identity-updates', async ({peerId}) => {
    let [data, ok] = await get(`/identities/${peerId}`);
    if (ok) {
      state.identities[peerId] = data;
      state.update('identities');
    }
  });
  swarm.hub.subscribeAnonymous('room-info', data => {
    console.log('new room info', data);
    updateApiQuery(`/rooms/${state.roomId}`, data);
  });
  _disconnectRoom = () => {
    if (swarm.connected && swarm.room === roomId) swarm.disconnect();
  };
  return _disconnectRoom;
}

function disconnectRoom() {
  _disconnectRoom?.();
  _disconnectRoom = null;
}

// watch changes in room
on(state, 'room', (room, oldRoom) => {
  let {speakers: oldSpeakers, moderators: oldModerators} = oldRoom;
  let {speakers, moderators} = room;

  let myId = identity.publicKey;
  if (!oldSpeakers.includes(myId) && speakers.includes(myId)) {
    set(state, 'iAmSpeaker', true);
    joinStage();
  }
  if (oldSpeakers.includes(myId) && !speakers.includes(myId)) {
    set(state, 'iAmSpeaker', false);
  }
  if (!oldModerators.includes(myId) && moderators.includes(myId)) {
    set(state, 'iAmModerator', true);
  }
  if (oldModerators.includes(myId) && !moderators.includes(myId)) {
    set(state, 'iAmModerator', false);
  }
});

async function addRole(id, role) {
  let {speakers, moderators} = state.room;
  if (!state.iAmModerator) return;
  if (role !== 'speakers' && role !== 'moderators') return;
  let existing = role === 'speakers' ? speakers : moderators;
  if (existing.includes(id)) return;
  console.log('adding to', role, id);
  let newRoom = {...state.room, [role]: [...existing, id]};
  await put(`/rooms/${state.roomId}`, newRoom);
}

async function removeRole(id, role) {
  let {speakers, moderators} = state.room;
  if (!state.iAmModerator) return;
  if (role !== 'speakers' && role !== 'moderators') return;
  let existing = role === 'speakers' ? speakers : moderators;
  if (!existing.includes(id)) return;
  console.log('removing from', role, id);
  let newRoom = {...state.room, [role]: existing.filter(id_ => id_ !== id)};
  await put(`/rooms/${state.roomId}`, newRoom);
}

function leaveStage(roomId) {
  roomId = roomId || state.roomId;
  if (!state.iAmSpeaker || swarm.room !== roomId) return;
  swarm.sharedState.leftStage = true;
  update(swarm, 'sharedState');
}
function joinStage() {
  if (!swarm.sharedState.leftStage) return;
  swarm.sharedState.leftStage = false;
  update(swarm, 'sharedState');
}
// if somebody left stage, update speakers
on(swarm, 'peerState', peerState => {
  let {speakers} = state.room;
  if (!state.roomId || !speakers.length) return;
  for (let peerId in peerState) {
    let leftStage = peerState[peerId]?.leftStage;
    if (leftStage && speakers.includes(peerId)) {
      if (state.iAmModerator) {
        removeRole(peerId, 'speakers');
      } else {
        speakers = speakers.filter(id => id !== peerId);
        updateApiQuery(`/rooms/${state.roomId}`, {...state.room, speakers});
      }
    }
  }
});

const emptyRoom = {
  name: '',
  description: '',
  speakers: [],
  moderators: [],
};
