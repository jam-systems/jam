import {useEffect} from 'react';
import {is, on} from 'use-minimal-state';
import log from '../lib/causal-log';
import {useState} from './state-tree';

export {until, useSync, debug, useDidChange, useDidEverChange};

async function until(state, key, condition) {
  let value = state[key];
  if (condition ? condition(value) : value) {
    return value;
  } else {
    return new Promise(resolve => {
      let off = on(state, key, value => {
        if (condition ? condition(value) : value) {
          off();
          resolve(value);
        }
      });
    });
  }
}

function useDidChange(value, initial) {
  let [oldValue, setValue] = useState(initial);
  if (value !== oldValue) {
    setValue(value);
    return true;
  } else {
    return false;
  }
}

function useDidEverChange(value, initial) {
  let [hasChanged, setChanged] = useState(false);
  let [oldValue, setValue] = useState(initial);
  if (value !== oldValue) {
    setValue(value);
    setChanged(true);
    return [true, true];
  } else {
    return [false, hasChanged];
  }
}

async function useSync(...args) {
  let deps = args.pop();
  useEffect(() => {
    is(...args);
  }, deps);
}

function debug(state) {
  on(state, (key, value, oldValue) => {
    if (oldValue !== undefined) {
      log(key, oldValue, '->', value);
    } else {
      log(key, value);
    }
  });
}
