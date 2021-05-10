import {is, on} from 'use-minimal-state';

// a kind of "React for app state"

// element = {Component, key, props, result, children}
// children = [element]
// result = Component(props) = partial state

export {$, declareStateRoot, useState, useMemo};

const root = {children: []};
let current = root;
let rootKey = 1;
let isRendering = 0;
let nUses = 0;

const updateSet = new Set();

function $(Component, props, state) {
  let key = props?.key;
  let element = current.children.find(
    c => c.Component === Component && c.key === key
  );
  // console.log('STATE-TREE', 'rendering', Component, props);

  let mustUpdate = updateSet.has(element);
  if (mustUpdate) updateSet.delete(element);

  // return fast if we can avoid re-running
  if (sameProps(element?.props, props) && !mustUpdate) {
    // console.log('STATE-TREE', 'early return');
    return element.last;
  }

  if (element === undefined) {
    element = {
      Component,
      props,
      key,
      children: [],
      last: null,
      uses: [],
      globalState: state,
      parent: current,
    };
    console.log('STATE-TREE', 'mounting new element', element);
    current.children.push(element);
  } else {
    element.props = props;
  }

  // run component
  let tmp = [current, nUses];
  current = element;
  nUses = 0;
  let result = Component(props, element);
  element.last = result;
  [current, nUses] = tmp;

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
  let result = $(Component, {...state, key}, state);
  console.log('STATE-TREE', 'root render returned', result);
  isRendering = 0;

  on(state, (key_, value, oldValue) => {
    if (
      isRendering !== key &&
      !(oldValue !== undefined && value === oldValue)
    ) {
      console.log('STATE-TREE', 'root render caused by', key_);
      isRendering = key;
      let result = $(Component, {...state, key}, state);
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
function queueUpdate(caller) {
  let parent = caller;
  updateSet.add(parent);
  while (parent.parent !== root) {
    parent = parent.parent;
    updateSet.add(parent);
  }
  let top = parent;
  // rerender root
  queueMicrotask(() => {
    console.log(updateSet);
    if (!updateSet.has(top)) return;
    console.log('STATE-TREE', 'root render caused by setState');
    isRendering = top.key;
    let result = $(
      top.Component,
      {...top.props, key: top.key},
      top.globalState
    );
    isRendering = 0;
    console.log('STATE-TREE', 'root render returned', result);
  });
}

function useState(initial) {
  if (current === root)
    throw Error('useState can only be called during render');
  let caller = current;
  // console.log('STATE-TREE', 'useState', nUses, caller.uses);
  let use = caller.uses[nUses];
  if (use === undefined) {
    use = [initial, null];
    use[1] = value => {
      if (value === use[0]) return;
      // console.log('STATE-TREE', 'use setState', value, caller);
      use[0] = value;
      queueUpdate(caller);
    };
    caller.uses[nUses] = use;
  }
  nUses++;
  return use;
}

function useMemo(func, deps) {
  if (current === root) throw Error('useMemo can only be called during render');
  let caller = current;
  // console.log('STATE-TREE', 'useState', nUses, caller.uses);
  let use = caller.uses[nUses];
  if (use === undefined) use = [undefined, undefined];
  if (use[1] === undefined || !arrayEqual(use[1], deps)) {
    use[1] = deps;
    use[0] = func(use[0]);
    caller.uses[nUses] = use;
  }
  nUses++;
  return use[0];
}

function arrayEqual(a, b) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
