import swarm from '../lib/swarm';
import state from './state';
import {get, updateApiQuery, forwardApiQuery} from './backend';
import {on, set} from 'use-minimal-state';
import identity from './identity';

export const emptyRoom = {
  name: '',
  description: '',
  speakers: [],
  moderators: [],
};

export function connectRoom(roomId) {
  if (swarm.connected) swarm.disconnect();
  swarm.connect(roomId);
  swarm.hub.subscribe('identity-updates', async ({peerId}) => {
    state.set('identities', {
      ...state.identities,
      [peerId]: await get(`/identities/${peerId}`),
    });
  });
  swarm.hub.subscribeAnonymous('room-info', data => {
    console.log('new room info', data);
    updateApiQuery(`/rooms/${swarm.room}`, data, 200);
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
