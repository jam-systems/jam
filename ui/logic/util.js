import {on} from 'use-minimal-state';
import log from '../lib/causal-log';

export {arrayRemove, debug};

function arrayRemove(arr, el) {
  let i = arr.indexOf(el);
  if (i !== -1) arr.splice(i, 1);
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
