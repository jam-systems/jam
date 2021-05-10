import {useEffect} from 'react';
import {is, on} from 'use-minimal-state';
import log from '../lib/causal-log';

export {until, useSync, debug, declare, declareStateRoot};

// a kind of "React for app state"

// element = {Component, key, props, result, children}
// children = [element]
// result = Component(props) = partial state

const rootChildren = [];
let siblings = rootChildren;
let rootKey = 0;

function declare(Component, props, state) {
  let key = props?.key;
  let element = siblings.find(c => c.Component === Component && c.key === key);
  console.log('STATE-TREE', 'rendering', Component, props);

  // return fast if we can avoid re-running
  if (sameProps(element?.props, props)) {
    console.log('STATE-TREE', 'early return');
    return element.last;
  }

  if (element === undefined) {
    element = {Component, props, key, children: [], last: null};
    console.log('STATE-TREE', 'mounting new element', element);
    siblings.push(element);
  } else {
    element.props = props;
  }

  // run component
  let parentChildren = siblings;
  siblings = element.children;
  let result = Component(props, element);
  element.last = result;
  siblings = parentChildren;

  // optionally use result to update state
  if (state !== undefined) {
    is(state, result);
  }
  return result;
}

// for creating state obj at the top level & later rerun on update
function declareStateRoot(Component, state) {
  siblings = rootChildren;
  if (state === undefined) state = {};
  const key = rootKey++;

  let isRendering = true;
  let result = declare(Component, {...state, key}, state);
  console.log('STATE-TREE', 'root render returned', result);
  isRendering = false;

  on(state, (key_, value) => {
    if (!isRendering) {
      console.log('STATE-TREE', 'root render caused by', key_, value);
      isRendering = true;
      let result = declare(Component, {...state, key}, state);
      console.log('STATE-TREE', 'root render returned', result);
      isRendering = false;
    }
  });

  return state;
}

function sameProps(prevProps, props) {
  if (prevProps === undefined) return false;
  if (prevProps === props) return true;
  if (props === null || props === undefined) return false;
  for (let key in prevProps) {
    if (!(key in props) || props[key] !== prevProps[key]) return false;
  }
  for (let key in props) {
    if (!(key in prevProps) || props[key] !== prevProps[key]) return false;
  }
  return true;
}

// other minimal-state utils

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
