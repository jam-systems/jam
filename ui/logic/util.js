import {useEffect} from 'react';
import {is, on} from 'use-minimal-state';
import log from '../lib/causal-log';

export {arrayRemove, debug, until, domEvent, useSync, mergeClasses};

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

function domEvent(el, event) {
  return new Promise(resolve => {
    el.addEventListener(event, function onEvent() {
      el.removeEventListener(event, onEvent);
      resolve();
    });
  });
}

async function useSync(...args) {
  let deps = args.pop();
  useEffect(() => {
    is(...args);
  }, deps);
}

function mergeClasses(...classes) {
  return classes.filter(x => x).join(' ');
}
