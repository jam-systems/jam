import {update} from 'use-minimal-state';
import {useExternalState} from '../lib/state-tree';
import {API} from './backend';
import {signedToken} from './identity';

export {getRequest, populateCache, getCache, setCache};

export default function GetRequest() {
  let ourState = 'idle'; // 'loading', 'success', 'error'

  return function GetRequest({path, dontFetch = false}) {
    let {state, data, status} = useExternalState(queryCache, path) ?? idleQuery;
    let shouldFetch = !!path && !dontFetch;
    let actionRequired = shouldFetch && state === 'idle';

    if (!shouldFetch) {
      ourState = 'idle';
      return {data: null, status: null, isLoading: false};
    }

    if (actionRequired) {
      // console.log('GetRequest: action required!', path);
      ourState = 'loading';
      getRequest(path);
    } else {
      ourState = state;
    }
    let isLoading = ourState === 'loading';
    return {data, status, isLoading};
  };
}

async function getRequest(path) {
  setCache(path, {state: 'loading'});

  let res = await fetch(API + path, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Token ${signedToken()}`,
    },
  }).catch(console.warn);
  let {state, data, status} = getCache(path);
  if (state !== 'loading') {
    // someone else already reset the cache, use it
    return [data, state === 'success', status];
  }
  if (res === undefined) {
    // TODO: probably no internet, we don't count that as an error for now to ensure it always tries refetching
    // but we eventually should have some global online monitoring / refetching and count as error
    setCache(path, idleQuery);
    return [null, false, null];
  }
  status = res.status;
  let ok = status < 400;
  if (ok) {
    state = 'success';
    data = (await res.json().catch(console.warn)) ?? null;
  } else {
    state = 'error';
    data = null;
  }
  setCache(path, {state, data, status});
  return [data, ok, status];
}

// TODO merge this cache w/ the one for useApiQuery
const queryCache = {}; // path: {state, data, status}, state = 'idle', 'loading', 'success', 'error'
const idleQuery = {state: 'idle', data: null, status: null};

function getCache(path) {
  return queryCache[path] ?? idleQuery;
}

function setCache(path, {state, data, status}) {
  let cached = queryCache[path];
  if (cached === undefined) {
    queryCache[path] = {state, data: data ?? null, status: status ?? null};
  } else {
    merge(cached, {state, data, status});
  }
  update(queryCache, path);
}

function populateCache(path, data) {
  setCache(path, {data, state: 'success', status: 200});
}

function merge(obj, partialObj) {
  for (let key in partialObj) {
    let value = partialObj[key];
    if (value !== undefined) {
      obj[key] = value;
    }
  }
}
