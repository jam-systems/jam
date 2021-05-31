import {on} from 'use-minimal-state';
import {staticConfig} from './config';
import {emptyRoom} from './room';
import {populateCache} from './GetRequest';
import {signData, signedToken} from '../lib/identity-utils';

let API = `${staticConfig.urls.pantry}/api/v1`;
on(staticConfig, () => {
  API = `${staticConfig.urls.pantry}/api/v1`;
});

export function updateApiQuery(path, data) {
  populateCache(path, data);
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
export async function get(path) {
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

export async function post(state, path, payload) {
  return authenticatedApiRequest(state, 'POST', path, payload);
}

export async function put(state, path, payload) {
  return authenticatedApiRequest(state, 'PUT', path, payload);
}

export async function putOrPost(state, path, payload) {
  return (
    (await put(state, path, payload)) || (await post(state, path, payload))
  );
}

export async function deleteRequest(state, path, payload = null) {
  return authenticatedApiRequest(state, 'DELETE', path, payload);
}

export async function createRoom(
  state,
  roomId,
  {name = '', description = '', logoURI, color, stageOnly} = {}
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
  if (ok) populateCache(`/rooms/${roomId}`, room);
  return ok;
}

export async function updateRoom(state, roomId, room) {
  if (!roomId || !room) return;
  return await put(state, `/rooms/${roomId}`, room);
}
