import {put, populateApiCache, apiUrl} from './backend';
import {staticConfig} from './config';
import {use, useOn, useRootState} from '../lib/state-tree';
import GetRequest, {getCache} from '../lib/GetRequest';

export {
  RoomState,
  addSpeaker,
  addModerator,
  removeSpeaker,
  removeModerator,
  emptyRoom,
};

function RoomState({swarm}) {
  const state = useRootState();

  // if somebody left stage, update speakers
  useOn(swarm.peerState, (peerId, peerState) => {
    let {speakers} = state.room;
    if (peerState?.leftStage && state.roomId && speakers.includes(peerId)) {
      if (state.iAmModerator) {
        removeSpeaker(state, state.roomId, peerId);
      } else {
        speakers = speakers.filter(id => id !== peerId);
        populateApiCache(`/rooms/${state.roomId}`, {
          ...state.room,
          speakers,
        });
      }
    }
  });

  return function RoomState({roomId, myId}) {
    const path = roomId && apiUrl() + `/rooms/${roomId}`;
    let {data} = use(GetRequest, {path});
    let hasRoom = !!data;
    let room = data ?? emptyRoom;

    let {speakers, moderators, stageOnly} = room;
    let iAmSpeaker = !!stageOnly || speakers.includes(myId);
    let iAmModerator = moderators.includes(myId);

    return {room, hasRoom, iAmSpeaker, iAmModerator};
  };
}

const emptyRoom = {
  name: '',
  description: '',
  ...(staticConfig.defaultRoom ?? null),
  speakers: [],
  moderators: [],
};

function getCachedRoom(roomId) {
  if (!roomId) return false;
  return getCache(`${apiUrl()}/rooms/${roomId}`).data;
}

async function addSpeaker(state, roomId, peerId) {
  let room = getCachedRoom(roomId);
  if (room === null) return false;
  let {speakers = []} = room;
  if (speakers.includes(peerId)) return true;
  let newRoom = {...room, speakers: [...speakers, peerId]};
  return await put(state, `/rooms/${roomId}`, newRoom);
}

async function addModerator(state, roomId, peerId) {
  let room = getCachedRoom(roomId);
  if (room === null) return false;
  let {moderators = []} = room;
  if (moderators.includes(peerId)) return true;
  let newRoom = {...room, moderators: [...moderators, peerId]};
  return await put(state, `/rooms/${roomId}`, newRoom);
}

async function removeSpeaker(state, roomId, peerId) {
  let room = getCachedRoom(roomId);
  if (room === null) return false;
  let {speakers = []} = room;
  if (!speakers.includes(peerId)) return true;
  let newRoom = {...room, speakers: speakers.filter(id => id !== peerId)};
  return await put(state, `/rooms/${roomId}`, newRoom);
}

async function removeModerator(state, roomId, peerId) {
  let room = getCachedRoom(roomId);
  if (room === null) return false;
  let {moderators = []} = room;
  if (!moderators.includes(peerId)) return true;
  let newRoom = {...room, moderators: moderators.filter(id => id !== peerId)};
  return await put(state, `/rooms/${roomId}`, newRoom);
}

// async function addRole(state, id, role) {
//   let {room, roomId} = state;
//   let {speakers, moderators} = room;
//   let existing = role === 'speakers' ? speakers : moderators;
//   if (existing.includes(id)) return;
//   log('adding to', role, id);
//   let newRoom = {...room, [role]: [...existing, id]};
//   await put(state, `/rooms/${roomId}`, newRoom);
// }

// async function removeRole(state, id, role) {
//   let {room, roomId} = state;
//   let {speakers, moderators} = room;
//   let existing = role === 'speakers' ? speakers : moderators;
//   if (!existing.includes(id)) return;
//   log('removing from', role, id);
//   let newRoom = {...room, [role]: existing.filter(id_ => id_ !== id)};
//   await put(state, `/rooms/${roomId}`, newRoom);
// }
