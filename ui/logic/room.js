import swarm from '../lib/swarm';
import state from './state';
import {get, updateApiQuery, forwardApiQuery, put} from './backend';
import {on, set} from 'use-minimal-state';
import identity, {signedToken} from './identity';

export {connectRoom, addRole, removeRole};

function connectRoom(roomId) {
  if (swarm.connected) swarm.disconnect();
  set(state, 'roomId', roomId);
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
    updateApiQuery(`/rooms/${state.roomId}`, data, 200);
  });
  forwardApiQuery(`/rooms/${roomId}`, 'room', emptyRoom);
}

// watch changes in room
on(state, 'room', (room, oldRoom) => {
  let {speakers: oldSpeakers, moderators: oldModerators} = oldRoom;
  let {speakers, moderators} = room;

  let myId = identity.publicKey;
  if (!oldSpeakers.includes(myId) && speakers.includes(myId)) {
    set(state, 'iAmSpeaker', true);
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
  await put(signedToken(), `/rooms/${state.roomId}`, newRoom);
}

async function removeRole(id, role) {
  let {speakers, moderators} = state.room;
  if (!state.iAmModerator) return;
  if (role !== 'speakers' && role !== 'moderators') return;
  let existing = role === 'speakers' ? speakers : moderators;
  if (!existing.includes(id)) return;
  console.log('removing from', role, id);
  let newRoom = {...state.room, [role]: existing.filter(id_ => id_ !== id)};
  await put(signedToken(), `/rooms/${state.roomId}`, newRoom);
}

const emptyRoom = {
  name: '',
  description: '',
  speakers: [],
  moderators: [],
};
