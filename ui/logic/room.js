import {swarm} from './state';
import {put} from './backend';
import log from '../lib/causal-log';
import {staticConfig} from './config';
import {use, useOn, useRootState} from '../lib/state-tree';
import GetRequest, {populateCache} from './GetRequest';

export {useRoom, RoomState, addRole, removeRole, emptyRoom};

function RoomState() {
  const state = useRootState();

  // if somebody left stage, update speakers
  useOn(swarm.peerState, (peerId, peerState) => {
    let {speakers} = state.room;
    if (peerState?.leftStage && state.roomId && speakers.includes(peerId)) {
      if (state.iAmModerator) {
        removeRole(state, peerId, 'speakers');
      } else {
        speakers = speakers.filter(id => id !== peerId);
        populateCache(`/rooms/${state.roomId}`, {...state.room, speakers});
      }
    }
  });

  return function RoomState({roomId, myId}) {
    const path = roomId && `/rooms/${roomId}`;
    let {data} = use(GetRequest, {path});
    let hasRoom = !!data;
    let room = data ?? emptyRoom;

    let {speakers, moderators, stageOnly} = room;
    let iAmSpeaker = !!stageOnly || speakers.includes(myId);
    let iAmModerator = moderators.includes(myId);

    return {room, hasRoom, iAmSpeaker, iAmModerator};
  };
}

function useRoom(roomId) {
  const path = roomId && `/rooms/${roomId}`;
  let {data, isLoading, status} = use(GetRequest, {path});
  return [data, isLoading, status];
}

const emptyRoom = {
  name: '',
  description: '',
  ...(staticConfig.defaultRoom ?? null),
  speakers: [],
  moderators: [],
};

async function addRole({room, roomId}, id, role) {
  let {speakers, moderators} = room;
  let existing = role === 'speakers' ? speakers : moderators;
  if (existing.includes(id)) return;
  log('adding to', role, id);
  let newRoom = {...room, [role]: [...existing, id]};
  await put(`/rooms/${roomId}`, newRoom);
}

async function removeRole({room, roomId}, id, role) {
  let {speakers, moderators} = room;
  let existing = role === 'speakers' ? speakers : moderators;
  if (!existing.includes(id)) return;
  log('removing from', role, id);
  let newRoom = {...room, [role]: existing.filter(id_ => id_ !== id)};
  await put(`/rooms/${roomId}`, newRoom);
}
