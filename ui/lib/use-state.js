import {useState, useEffect, useRef} from 'react';

export default function use(state, key) {
  let [, setState] = useState(0);
  useEffect(() => {
    let isOff = false;
    let updater = () => {
      if (!isOff) setState(n => n + 1);
    };
    state.on(key, updater);
    return () => {
      isOff = true;
      state.off(key, updater);
    };
  }, [key]);
  return state.get(key);
}

export function useMany(state, keys) {
  let [, setState] = useState(0);
  keys = useStableArray(keys);

  useEffect(() => {
    let isOff = false;
    let updater = () => {
      if (!isOff) setState(n => n + 1);
    };
    for (let key of keys) {
      state.on(key, updater);
    }
    return () => {
      isOff = true;
      for (let key of keys) {
        state.off(key, updater);
      }
    };
  }, [keys]);
  return keys.map(key => state[key]);
}

function useStableArray(newArray) {
  let oldArrayRef = useRef();
  let oldArray = oldArrayRef.current;
  let stableArray = arrayEqual(oldArray, newArray) ? oldArray : newArray;
  useEffect(() => {
    oldArrayRef.current = stableArray;
  }, [stableArray]);
  return stableArray;
}

function arrayEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
