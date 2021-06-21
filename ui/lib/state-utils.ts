import {on} from 'minimal-state';
import log from './causal-log';
import {useState} from './state-tree';

export {until, debug, useDidChange, useDidEverChange};

async function until<T, K extends keyof T>(
  state: T,
  key: K,
  condition?: (value: T[K]) => boolean
) {
  let value = state[key];
  if (condition ? condition(value) : value) {
    return value;
  } else {
    return new Promise(resolve => {
      let off = on(state, key, value => {
        if (condition ? condition(value as T[K]) : value) {
          off();
          resolve(value);
        }
      });
    });
  }
}

function useDidChange<T>(value: T, initial: T) {
  let [oldValue, setValue] = useState(initial);
  if (value !== oldValue) {
    setValue(value);
    return true;
  } else {
    return false;
  }
}

function useDidEverChange<T>(value: T, initial: T) {
  let [hasChanged, setChanged] = useState(false);
  let [oldValue, setValue] = useState(initial);
  if (value !== oldValue) {
    setValue(value);
    setChanged(true);
    return [true, true];
  } else {
    return [false, hasChanged as boolean];
  }
}

function debug<T>(state: T) {
  on(state, (key, value, oldValue) => {
    if (oldValue !== undefined) {
      log(key, oldValue, '->', value);
    } else {
      log(key, value);
    }
  });
}
