import {is, on, emit} from 'use-minimal-state';

// a kind of "React for app state"

// element = {Component, key, props, result, children}
// children = [element]
// result = Component(props) = partial state

export {S, declareStateRoot, useAction, useUpdate, useState, useMemo, dispatch};

const root = {children: []};
let current = root;
let isRendering = 0;
let nUses = 0;
let currentAction = [undefined, undefined];

const updateSet = new Set();

function S(Component, props, state) {
  let key = props?.key;
  let element = current.children.find(
    c => c.component === Component && c.key === key
  );
  // console.log('STATE-TREE', 'rendering', Component, props);

  let mustUpdate = updateSet.has(element);
  if (mustUpdate) updateSet.delete(element);

  // return fast if we can avoid re-running
  if (sameProps(element?.props, props) && !mustUpdate) {
    // console.log('STATE-TREE', 'early return');
    return element.last;
  }

  let isMount = false;
  if (element === undefined) {
    isMount = true;
    element = {
      component: Component,
      render: Component,
      props,
      key,
      children: [],
      last: null,
      uses: [],
      state,
      parent: current,
      subs: new Map(),
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
  let result;
  if (isMount) {
    // handle level-2 component
    result = Component(props);
    if (typeof result === 'function') {
      // console.log('STATE-TREE', 'new element returned a function', result);
      element.render = result;
      result = element.render(props);
    }
  } else {
    result = element.render(props);
  }
  element.last = result;
  [current, nUses] = tmp;

  // optionally use result to update state
  if (element.state !== undefined) {
    is(element.state, result);
  }
  return result;
}

// for creating state obj at the top level & later rerun on update
function declareStateRoot(Component, state) {
  current = root;
  if (state === undefined) state = {};

  const key = {};
  isRendering = key;
  let result = S(Component, {...state, key}, state);
  console.log('STATE-TREE', 'initial root render returned', result);
  isRendering = 0;

  const rootElement = root.children.find(c => c.key === key);

  on(state, (_key, value, oldValue) => {
    // TODO check components using state keys
    if (isRendering !== key && (oldValue === undefined || value !== oldValue)) {
      console.log('STATE-TREE', 'root render caused by', _key);
      isRendering = key;
      let result = S(Component, {...state, key});
      isRendering = 0;
      console.log('STATE-TREE', 'root render returned', result);
    }
  });
  const dispatch = (type, payload) => {
    console.log('dispatching', type, payload);
    dispatchFromRoot(rootElement, type, payload);
  };
  on(state, 'dispatch', dispatch);
  return {state, dispatch};
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
  let rootElement = markForUpdate(caller);
  // rerender root
  queueMicrotask(() => {
    if (!updateSet.has(rootElement)) return;
    console.log('STATE-TREE', 'root render caused by setState');
    let result = rerender(rootElement);
    console.log('STATE-TREE', 'root render returned', result);
  });
}

function markForUpdate(element) {
  let parent = element;
  updateSet.add(parent);
  while (parent.parent !== root) {
    parent = parent.parent;
    updateSet.add(parent);
  }
  return parent;
}

function getRootElement() {
  return root.children.find(c => c.key === isRendering);
}

function rerender(rootElement) {
  isRendering = rootElement.key;
  let result = S(rootElement.component, {
    ...rootElement.props,
    key: rootElement.key,
  });
  isRendering = 0;
  return result;
}

function dispatch(state, type, payload) {
  emit(state, 'dispatch', type, payload);
}

function dispatchFromRoot(rootElement, type, payload) {
  let subscribers = rootElement.subs.get(type);
  if (subscribers === undefined || subscribers.size === 0) return;

  console.log('STATE-TREE', 'root render caused by dispatch');
  isRendering = rootElement.key;
  currentAction = [type, payload];
  for (let element of subscribers) {
    markForUpdate(element);
  }
  let result = S(rootElement.component, {
    ...rootElement.props,
    key: rootElement.key,
  });
  currentAction = [undefined, undefined];
  isRendering = 0;
  console.log('STATE-TREE', 'root render returned', result);
}

function useAction(type) {
  if (current === root)
    throw Error('useAction can only be called during render');
  let rootElement = getRootElement();
  let subscribers =
    rootElement.subs.get(type) ??
    rootElement.subs.set(type, new Set()).get(type);
  subscribers.add(current);
  const dispatchThis = p => dispatch(rootElement, type, p);
  if (currentAction[0] === type) {
    return [true, currentAction[1], dispatchThis];
  } else {
    return [false, undefined, dispatchThis];
  }
}

function useUpdate() {
  if (current === root)
    throw Error('useUpdate can only be called during render');
  let caller = current;
  return () => queueUpdate(caller);
}

function useState(initial) {
  if (current === root)
    throw Error('useState can only be called during render');
  let caller = current;
  let use = caller.uses[nUses];
  if (use === undefined) {
    const setState = value => {
      if (value === use[0]) return;
      use[0] = value;
      if (current !== caller) {
        queueUpdate(caller);
      }
      return value;
    };
    use = [initial, setState];
    caller.uses[nUses] = use;
  }
  nUses++;
  return use;
}

function useMemo(func, deps) {
  if (current === root) throw Error('useMemo can only be called during render');
  let caller = current;
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
