import {useCallback, useEffect, useState} from 'react';
import {use} from 'use-minimal-state';
import state from './state.js';
import {jamHost} from './config';
// POST https://jam.systems/_/pantry/api/v1/rooms/:roomId {"moderators": [moderatorId], "speakers":[speakerid]}
// Creates room, returns 409 conflict if room exists

// GET https://jam.systems/_/pantry/api/v1/rooms/:roomId
// returns {"moderators": [moderatorId], "speakers":[speakerid]}

// PUT https://jam.systems/_/pantry/api/v1/rooms/:roomId {"moderators": [moderatorId], "speakers":[speakerid]}
// updates room and broadcasts to roomId / channel room-info on signal hub

const API = `https://${jamHost()}/_/pantry/api/v1`;

export function useApiQuery(path, doFetch = true) {
  let cached = use(state, 'queries')[path];
  let shouldFetch = path && doFetch && !cached;
  let [isLoading, setLoading] = useState(shouldFetch);

  let refetch = useCallback(async () => {
    let res = await fetch(API + path).catch(console.warn);
    if (!res) {
      setLoading(false);
      return;
    }

    let data;
    if (res.status < 400) data = await res.json().catch(console.warn);
    updateApiQuery(path, data, res.status);
    setLoading(false);
  }, [path]);

  useEffect(() => {
    if (shouldFetch) refetch();
    else setLoading(false);
  }, [shouldFetch, refetch]);

  let {data, status} = cached || {};
  return [data, isLoading, status, refetch];
}

export function updateApiQuery(path, data, status) {
  state.set('queries', {...state.queries, [path]: data && {data, status}});
}

export function forwardApiQuery(path, key, defaultQuery) {
  state.set(key, state.queries[path]?.data || defaultQuery);
  state.on('queries', (queries, oldQueries) => {
    let data = queries[path]?.data || defaultQuery;
    let oldData = oldQueries[path]?.data || defaultQuery;
    if (data !== oldData) state.set(key, data);
  });
}

async function authenticatedApiRequest(method, token, path, payload) {
  let res = await fetch(API + path, {
    method: method.toUpperCase(),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

export async function get(path) {
  let res = await fetch(API + path, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
  if (res.status < 400) return res.json();
  else {
    let err = new Error();
    err.status = res.status;
    throw err;
  }
}

export async function post(token, path, payload) {
  return authenticatedApiRequest('POST', token, path, payload);
}

export async function put(token, path, payload) {
  return authenticatedApiRequest('PUT', token, path, payload);
}

export async function createRoom(
  roomId,
  name,
  description,
  logoURI,
  color,
  peerId
) {
  return post('', `/rooms/${roomId}`, {
    name,
    description,
    logoURI,
    color,
    moderators: [peerId],
    speakers: [peerId],
  });
}
