import state, {swarm} from './state';
import {get, put} from './backend';
import {is, on, set, update} from 'use-minimal-state';
import {currentId} from './identity';
import log from '../lib/causal-log';
import {staticConfig} from './config';
import {use} from '../lib/state-tree';
import GetRequest, {populateCache} from './GetRequest';

export {
  useRoom,
  RoomState,
  maybeConnectRoom,
  disconnectRoom,
  addRole,
  removeRole,
  leaveStage,
  emptyRoom,
};

function RoomState({roomId, myId}) {
  const path = roomId && `/rooms/${roomId}`;
  let {data} = use(GetRequest, {path});
  let room = data ?? emptyRoom;

  let {speakers, moderators, stageOnly} = room;
  let iAmSpeaker = !!stageOnly || speakers.includes(myId);
  if (iAmSpeaker) joinStage();
  let iAmModerator = moderators.includes(myId);

  return {room, iAmSpeaker, iAmModerator};
}

function useRoom(roomId) {
  const path = roomId && `/rooms/${roomId}`;
  let {data, isLoading, status} = use(GetRequest, {path});
  return [data ?? emptyRoom, isLoading, status];
}

function maybeConnectRoom(roomId) {
  if (swarm.room === roomId && swarm.hub) return;
  log('connecting room', roomId);
  if (swarm.hub) swarm.disconnect();
  // make sure peerId is the current one
  swarm.config({myPeerId: currentId()});
  swarm.connect(roomId);
  on(swarm.peerEvent, 'identity-update', async peerId => {
    let [data, ok] = await get(`/identities/${peerId}`);
    if (ok) {
      state.identities[peerId] = data;
      update(state, 'identities');
    }
  });
  on(swarm.serverEvent, 'room-info', data => {
    log('new room info', data);
    populateCache(`/rooms/${state.roomId}`, data);
  });
  _disconnectRoom[roomId] = () => {
    log('disconnecting', roomId);
    if (swarm.connected && swarm.room === roomId) swarm.disconnect();
  };
}

function disconnectRoom(roomId) {
  if (!roomId) return;
  _disconnectRoom[roomId]?.();
  _disconnectRoom[roomId] = undefined;
}

const _disconnectRoom = {};

const emptyRoom = {
  name: '',
  description: '',
  ...(staticConfig.defaultRoom ?? null),
  speakers: [],
  moderators: [],
};

async function addRole(id, role) {
  let {speakers, moderators} = state.room;
  if (!state.iAmModerator) return;
  if (role !== 'speakers' && role !== 'moderators') return;
  let existing = role === 'speakers' ? speakers : moderators;
  if (existing.includes(id)) return;
  log('adding to', role, id);
  let newRoom = {...state.room, [role]: [...existing, id]};
  await put(`/rooms/${state.roomId}`, newRoom);
}

async function removeRole(id, role) {
  let {speakers, moderators} = state.room;
  if (!state.iAmModerator) return;
  if (role !== 'speakers' && role !== 'moderators') return;
  let existing = role === 'speakers' ? speakers : moderators;
  if (!existing.includes(id)) return;
  log('removing from', role, id);
  let newRoom = {...state.room, [role]: existing.filter(id_ => id_ !== id)};
  await put(`/rooms/${state.roomId}`, newRoom);
}

function leaveStage(roomId) {
  roomId = roomId || state.roomId;
  if (!state.iAmSpeaker || swarm.room !== roomId) return;
  set(swarm.myPeerState, 'leftStage', true);
}
function joinStage() {
  if (!swarm.myPeerState.leftStage) return;
  is(swarm.myPeerState, 'leftStage', false);
}
// if somebody left stage, update speakers
on(swarm.peerState, (peerId, peerState) => {
  let {speakers} = state.room;
  if (peerState?.leftStage && state.roomId && speakers.includes(peerId)) {
    if (state.iAmModerator) {
      removeRole(peerId, 'speakers');
    } else {
      speakers = speakers.filter(id => id !== peerId);
      populateCache(`/rooms/${state.roomId}`, {...state.room, speakers});
    }
  }
});
