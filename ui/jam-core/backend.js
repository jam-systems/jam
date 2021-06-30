import {on} from 'minimal-state';
import {staticConfig} from './config';
import {emptyRoom} from './room';
import {populateCache} from '../lib/GetRequest';
import {signData, signedToken} from '../lib/identity-utils';

export {
  apiUrl,
  populateApiCache,
  get,
  post,
  put,
  putOrPost,
  deleteRequest,
  createRoom,
  updateRoom,
};

let API = `${staticConfig.urls.pantry}/api/v1`;
on(staticConfig, () => {
  API = `${staticConfig.urls.pantry}/api/v1`;
});

function apiUrl() {
  return API;
}

function populateApiCache(path, data) {
  populateCache(API + path, data);
}

async function authenticatedApiRequest({myIdentity}, method, path, payload) {
  let res = await fetch(API + path, {
    method: method.toUpperCase(),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: payload ? JSON.stringify(signData(myIdentity, payload)) : undefined,
  });
  return res.ok;
}

// returns [data, ok, status]
async function get(path) {
  let res = await fetch(API + path, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
  if (res.status < 400) return [await res.json(), true, res.status];
  else return [undefined, false, res.status];
}

// returns [data, ok, status]
async function authedGet({myIdentity}, path) {
  let res = await fetch(API + path, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Token ${signedToken(myIdentity)}`,
    },
  });
  if (res.status < 400) return [await res.json(), true, res.status];
  else return [undefined, false, res.status];
}

async function post(state, path, payload) {
  return authenticatedApiRequest(state, 'POST', path, payload);
}

async function put(state, path, payload) {
  return authenticatedApiRequest(state, 'PUT', path, payload);
}

async function putOrPost(state, path, payload) {
  return (
    (await put(state, path, payload)) || (await post(state, path, payload))
  );
}

async function deleteRequest(state, path, payload = null) {
  return authenticatedApiRequest(state, 'DELETE', path, payload);
}

async function createRoom(
  state,
  roomId,
  {
    name = '',
    description = '',
    logoURI = undefined,
    color = undefined,
    stageOnly = false,
  } = {}
) {
  let {myId} = state;
  let room = {
    ...emptyRoom,
    name,
    description,
    logoURI,
    color,
    stageOnly: !!stageOnly,
    moderators: [myId],
    speakers: [myId],
  };
  let ok = await post(state, `/rooms/${roomId}`, room);
  if (ok) populateCache(API + `/rooms/${roomId}`, room);
  // if (ok) setTimeout(() => populateCache(API + `/rooms/${roomId}`, room), 0);
  return ok;
}

async function updateRoom(state, roomId, room) {
  if (!roomId || !room) return false;
  // don't accept updates that delete the moderator/speaker array
  // (=> explicitly set to [] if that is the intention)
  if (!room?.moderators || !room?.speakers) return false;
  return await put(state, `/rooms/${roomId}`, room);
}
