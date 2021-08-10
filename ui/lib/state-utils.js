import {on} from 'minimal-state';
import log from './causal-log';
import {useState} from './state-tree';

export {debug, useDidChange, useDidEverChange};

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

function debug(state) {
  on(state, (key, value, oldValue) => {
    if (oldValue !== undefined) {
      log(key, oldValue, '->', value);
    } else {
      log(key, value);
    }
  });
}
