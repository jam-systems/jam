import {apiUrl, put} from '../backend';
import {getCache} from '../../lib/GetRequest.js';

export {addPresenter, removePresenter};

function getCachedRoom(roomId) {
  if (!roomId) return null;
  return getCache(`${apiUrl()}/rooms/${roomId}`).data;
}

async function addPresenter(state, roomId, peerId) {
  let room = getCachedRoom(roomId);
  if (room === null) return false;
  let {presenters = []} = room;
  if (presenters.includes(peerId)) return true;
  let newRoom = {...room, presenters: [...presenters, peerId]};
  return await put(state, `/rooms/${roomId}`, newRoom);
}

async function removePresenter(state, roomId, peerId) {
  let room = getCachedRoom(roomId);
  if (room === null) return false;
  let {presenters = []} = room;
  if (!presenters.includes(peerId)) return true;
  let newRoom = {...room, presenters: presenters.filter(id => id !== peerId)};
  return await put(state, `/rooms/${roomId}`, newRoom);
}
