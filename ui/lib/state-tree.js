import {is, on, emit, update, set} from 'use-minimal-state';
import log from './causal-log';

// a kind of "React for app state"

// element = {component, key, props, children}
// children = [element]
// Component(props) = partial state

/* TODOs:

  -) enable more Component return values
  -) probably don't use minimal-state for internal update forwarding, or at least don't forward non-changes
  -) add API for using state-tree inside React components
  -) understand performance & optimize where possible
*/

export {
  use,
  declare,
  declareStateRoot,
  dispatch,
  useAction,
  useRootState,
  useUpdate,
  useState,
  useMemo,
  Fragment,
  merge,
};

const root = {children: []};
window.root = root;
let current = root;
let renderRoot = null;
let nUses = 0;
let renderTime = 0;
let currentAction = [undefined, undefined];

const updateSet = new Set();
const rootUpdateSet = new Set();

function declare(Component, props) {
  let key = props?.key;
  let element = current.children.find(
    c => c.component === Component && c.key === key
  );
  let newElement = _declare(Component, props, element);
  return newElement.atom;
}

function use(Component, props) {
  let key = props?.key;
  let element = current.children.find(
    c => c.component === Component && c.key === key
  );
  let newElement = _declare(Component, props, element, true);
  return getAtom(newElement.atom);
}

function _declare(Component, props = null, element, used = false) {
  let mustUpdate = updateSet.has(element);
  if (mustUpdate) updateSet.delete(element);

  if (sameProps(element?.props, props) && !mustUpdate) {
    element.renderTime = renderTime;
    return element;
  }

  // log('rendering', Component.name);

  let isMount = false;
  if (element === undefined) {
    isMount = true;
    element = {
      component: Component,
      render: Component,
      props,
      key: props?.key,
      children: [],
      uses: [],
      renderTime,
      parent: current,
      root: renderRoot,
      declared: !used,
      atom: undefined,
    };
    log('STATE-TREE', 'mounting new element', element.component.name);
    current.children.push(element);
  } else {
    element.props = props;
    element.renderTime = renderTime;
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
      element.render = result;
      result = element.render(props);
    }
  } else {
    result = element.render(props);
  }
  [current, nUses] = tmp;

  // unmount children that weren't rendered
  let children = element.children;
  for (let i = children.length - 1; i >= 0; i--) {
    let child = children[i];
    if (child.renderTime !== renderTime) {
      log('STATE-TREE', 'unmounting element', child);
      children.splice(i, 1);
      unsubscribeAll(renderRoot.actionSubs, child);
      unsubscribeAll(renderRoot.stateSubs, child);
    }
  }

  // process result (creates or updates element.atom)
  log('rendered', Component.name, 'with result', result);
  resultToAtom(result, element);

  return element;
}

// for creating state obj at the top level & later rerun on update
function declareStateRoot(Component, state, keys = []) {
  current = root;
  if (state === undefined) state = {};
  renderTime = Date.now();

  const rootElement = {
    component: Component,
    render: Component,
    props: undefined,
    key: {},
    children: [],
    uses: [],
    renderTime,
    parent: current,
    root: null,
    declared: true,
    atom: undefined,
    actionSubs: new Map(),
    stateSubs: new Map(),
    state,
  };
  rootElement.root = rootElement;
  log('STATE-TREE', 'mounting ROOT element', rootElement);
  current.children.push(rootElement);

  renderRoot = rootElement;
  _declare(Component, {...state}, rootElement);

  const rootAtom = rootElement.atom;
  let result = getAtom(rootAtom);
  is(state, result);

  log(
    'STATE-TREE',
    'initial root render returned',
    result,
    'after',
    Date.now() - renderTime
  );
  renderRoot = null;

  on(rootAtom, result => {
    log('STATE-TREE', 'root atom update triggered!', result);
    is(state, result);
  });

  on(state, (key, value, oldValue) => {
    if (oldValue !== undefined && value === oldValue) return;

    if (renderRoot !== rootElement && (keys === '*' || keys.includes(key))) {
      queueRootUpdate(rootElement, key);
    }

    // TODO: what updates should we queue on state updates during render?
    let subscribers = rootElement.stateSubs.get(key);
    if (subscribers !== undefined) {
      for (let element of subscribers) {
        queueUpdate(element, 'state ' + key);
      }
    }
  });

  const dispatch = (type, payload) => {
    log('dispatching', type, payload);
    dispatchFromRoot(rootElement, type, payload);
  };
  on(state, 'dispatch', dispatch);
  return {state, dispatch};
}

function sameProps(prevProps, props) {
  if (prevProps === undefined) return false;
  if (prevProps === props) return true;
  if (prevProps === null || props === null || props === undefined) return false;
  for (let key in prevProps) {
    if (!(key in props) || props[key] !== prevProps[key]) return false;
  }
  for (let key in props) {
    if (!(key in prevProps) || props[key] !== prevProps[key]) return false;
  }
  return true;
}

// rerendering
function queueUpdate(caller, reason = '') {
  log('queuing update', caller.component.name, reason);
  let rootElement = markForUpdate(caller);
  // rerender root
  queueMicrotask(() => {
    if (!updateSet.has(rootElement)) return;
    log(
      'STATE-TREE',
      'render caused by queueUpdate',
      caller.component.name,
      reason
    );
    let result = rerender(rootElement);
    log(
      'STATE-TREE',
      'render returned',
      result,
      'after',
      Date.now() - renderTime
    );
  });
}

function queueRootUpdate(rootElement, reason = '') {
  log('queuing root update', reason);
  rootUpdateSet.add(rootElement);
  queueMicrotask(() => {
    if (!rootUpdateSet.has(rootElement)) return;
    rootUpdateSet.delete(rootElement);

    log('STATE-TREE', 'root render caused by state update', reason);
    let {state, atom, component} = rootElement;
    renderRoot = rootElement;
    renderTime = Date.now();
    _declare(component, {...state}, rootElement);
    let result = getAtom(atom);
    is(state, result);
    renderRoot = null;
    log(
      'STATE-TREE',
      'root render returned',
      result,
      'after',
      Date.now() - renderTime
    );
  });
}

function markForUpdate(element) {
  // log('markForUpdate', element.component.name);
  let parent = element;
  // log('adding updateSet', parent.component.name);
  updateSet.add(parent);
  if (parent.declared) return parent;
  while (parent.parent !== root) {
    parent = parent.parent;
    // log('adding updateSet', parent.component.name);
    updateSet.add(parent);
    if (parent.declared) return parent;
  }
  return parent;
}

function rerender(element) {
  renderRoot = element.root;
  renderTime = Date.now();
  let result;
  if (element.declared) {
    log('STATE-TREE', 'rerendering', element.component.name);
    _declare(element.component, element.props, element);
    result = getAtom(element.atom);
    update(element.atom);
  } else {
    throw Error(
      'undeclared re-render! should not happen because used elements require update of parents'
    );
  }
  renderRoot = null;
  return result;
}

function dispatch(state, type, payload) {
  emit(state, 'dispatch', type, payload);
}

function dispatchFromRoot(rootElement, type, payload) {
  let subscribers = rootElement.actionSubs.get(type);
  if (subscribers === undefined || subscribers.size === 0) return;

  let actionRoots = new Set();
  for (let element of subscribers) {
    actionRoots.add(markForUpdate(element));
  }
  currentAction = [type, payload];
  for (let rootElement of actionRoots) {
    log('STATE-TREE', 'branch render caused by dispatch', rootElement);
    let result = rerender(rootElement);
    log(
      'STATE-TREE',
      'branch render returned',
      result,
      'after',
      Date.now() - renderTime
    );
  }
  currentAction = [undefined, undefined];
}

function subscribe(subscriptions, type, element) {
  let subscribers =
    subscriptions.get(type) ?? subscriptions.set(type, new Set()).get(type);
  subscribers.add(element);
}
function unsubscribeAll(subscriptions, element) {
  for (let entry of subscriptions) {
    let [key, set] = entry;
    set.delete(element);
    if (set.size === 0) {
      subscriptions.delete(key);
    }
  }
}

// TODO maybe more efficient to memo the next 2-3 hooks, like useState (not sure though)
function useAction(type) {
  if (current === root)
    throw Error('useAction can only be called during render');
  subscribe(renderRoot.actionSubs, type, current);
  const dispatchThis = p => dispatch(renderRoot, type, p);
  if (currentAction[0] === type) {
    return [true, currentAction[1], dispatchThis];
  } else {
    return [false, undefined, dispatchThis];
  }
}

function useRootState(keys) {
  if (current === root) throw Error('Hooks can only be called during render');
  let {state} = renderRoot;
  if (Array.isArray(keys)) {
    let values = [];
    for (let key of keys) {
      subscribe(renderRoot.stateSubs, key, current);
      values.push(state[key]);
    }
    return values;
  } else if (keys !== undefined) {
    subscribe(renderRoot.stateSubs, keys, current);
    return state[keys];
  } else {
    return state;
  }
}

function useUpdate() {
  if (current === root)
    throw Error('useUpdate can only be called during render');
  let caller = current;
  return () => queueUpdate(caller, 'useUpdate');
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
        queueUpdate(caller, 'useState ' + value);
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

function Fragment(value) {
  return Atom(value);
}

function Atom(value) {
  let atom = [value];
  atom._atom = true;
  atom._deps = new Map();
  on(atom, value => {
    for (let e of atom._deps) {
      e[1](value);
    }
  });
  return atom;
}

function getAtom(atom) {
  return atom[0];
}
function setAtom(atom, value) {
  atom[0] = value;
}
function addAtomDep(atom, dep, listener) {
  atom._deps.set(dep, listener);
}

function isAtom(thing) {
  return Array.isArray(thing) && thing._atom;
}

// TODO we should probably forward atom updates only when value changed
// (if didn't change nothing will be done in state root anyway)
// hint: some Components return undefined, which results in an empty atom for now
function resultToAtom(result, element) {
  if (element.atom === undefined) {
    element.atom = Atom();
  }
  let atom = element.atom;

  if (isAtom(result)) {
    setAtom(atom, getAtom(result));
    addAtomDep(result, atom, value => set(atom, value));
    return;
  }

  if (result?._merged) {
    setMergedAtom(atom, result);
    return;
  }

  if (typeof result === 'object') {
    setObjectAtom(atom, result);
  }
}

function setObjectAtom(objAtom, obj) {
  let pureObj = {};
  setAtom(objAtom, pureObj);
  for (let key in obj) {
    let atom = obj[key];
    if (isAtom(atom)) {
      pureObj[key] = getAtom(atom);
      addAtomDep(atom, objAtom, value => {
        pureObj[key] = value;
        update(objAtom);
      });
    } else {
      pureObj[key] = atom;
    }
  }
}

function merge(...objAtomArray) {
  objAtomArray._merged = true;
  return objAtomArray;
}

function setMergedAtom(atom, objAtomArray) {
  let mergedObj = {};

  function updateValue() {
    let objects = objAtomArray.map(oa => (isAtom(oa) ? getAtom(oa) : oa));
    let value = Object.assign(mergedObj, ...objects);
    return value;
  }
  setAtom(atom, updateValue());

  for (let objAtom of objAtomArray) {
    if (!isAtom(objAtom)) continue;
    addAtomDep(objAtom, atom, () => {
      set(atom, updateValue());
    });
  }
}
