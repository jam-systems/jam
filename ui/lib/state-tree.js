import {is, on} from 'use-minimal-state';

// a kind of "React for app state"

// element = {Component, key, props, result, children}
// children = [element]
// result = Component(props) = partial state

export {declare, declareStateRoot};

const root = {children: []};
let current = root;
let rootKey = 1;
let isRendering = 0;

const updateSet = new Set();

function declare(Component, props, state) {
  let key = props?.key;
  let element = current.children.find(
    c => c.Component === Component && c.key === key
  );
  console.log('STATE-TREE', 'rendering', Component, props);

  let mustUpdate = updateSet.has(element);

  // return fast if we can avoid re-running
  if (sameProps(element?.props, props) && !mustUpdate) {
    console.log('STATE-TREE', 'early return');
    return element.last;
  }

  if (mustUpdate) updateSet.delete(element);

  if (element === undefined) {
    element = {
      Component,
      props,
      key,
      children: [],
      last: null,
      state: {},
      globalState: state,
      parent: current,
    };
    console.log('STATE-TREE', 'mounting new element', element);
    current.children.push(element);
  } else {
    element.props = props;
  }

  // run component
  let tmp = [current];
  current = element;
  let result = Component(
    props,
    element.state,
    s => setComponentState(element, s),
    element
  );
  element.last = result;
  [current] = tmp;

  // optionally use result to update state
  if (state !== undefined) {
    is(state, result);
  }
  return result;
}

// for creating state obj at the top level & later rerun on update
function declareStateRoot(Component, state) {
  current = root;
  if (state === undefined) state = {};
  const key = rootKey++;

  isRendering = key;
  let result = declare(Component, {...state, key}, state);
  console.log('STATE-TREE', 'root render returned', result);
  isRendering = 0;

  on(state, (key_, value, oldValue) => {
    if (
      isRendering !== key &&
      !(oldValue !== undefined && value === oldValue)
    ) {
      console.log('STATE-TREE', 'root render caused by', key_, value);
      isRendering = key;
      let result = declare(Component, {...state, key}, state);
      console.log('STATE-TREE', 'root render returned', result);
      isRendering = 0;
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

// rerendering
function forceUpdate_(caller) {
  if (caller === current)
    throw Error('forceUpdate cannot be called during render');
  let parent = caller;
  updateSet.add(parent);
  while (parent.parent !== root) {
    parent = parent.parent;
    updateSet.add(parent);
  }
  let top = parent;
  // rerender root
  console.log('STATE-TREE', 'root render caused by setState', caller);
  isRendering = top.key;
  let result = declare(
    top.Component,
    {...top.props, key: top.key},
    top.globalState
  );
  isRendering = 0;
  console.log('STATE-TREE', 'root render returned', result);
}

function setComponentState(caller, state) {
  if (caller === current)
    throw Error('setComponentState cannot be called during render');
  if (sameState(caller.state, state)) return;
  queueMicrotask(() => {
    caller.state = {...caller.state, ...state};
    forceUpdate_(caller);
  });
}

function sameState(prevState, state) {
  if (state === undefined) return true;
  if (prevState === state) return true;
  for (let key in state) {
    if (!(key in prevState) || state[key] !== prevState[key]) return false;
  }
  return true;
}
