import {is, on, emit, update, set} from 'use-minimal-state';

// a kind of "React for app state"

// element = {Component, key, props, result, children}
// children = [element]
// result = Component(props) = partial state

/* TODOs:

  -) isRendering is currently only used for deduping state update renders which is not working
  -) find a solution for getRootElement
  -) enable more Component return values
  -) probably don't use minimal-state for internal update forwarding
  -) test with larger & more complex element trees
  -) add API for using state-tree inside React components
  -) understand performance & optimize where possible
*/

export {
  use,
  declare,
  declareStateRoot,
  useAction,
  useUpdate,
  useState,
  useMemo,
  dispatch,
  Fragment,
};

const root = {children: []};
window.root = root;
let current = root;
let isRendering = 0;
let nUses = 0;
let renderTime = 0;
let currentAction = [undefined, undefined];

const updateSet = new Set();

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

function _declare(Component, props, element, used = false) {
  let key = props?.key;

  let mustUpdate = updateSet.has(element);
  if (mustUpdate) updateSet.delete(element);

  if (sameProps(element?.props, props) && !mustUpdate) {
    element.renderTime = renderTime;
    return element;
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
      uses: [],
      renderTime,
      parent: current,
      declared: !used,
      atom: undefined,
    };
    console.log('STATE-TREE', 'mounting new element', element);
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
      console.log('STATE-TREE', 'unmounting element', child);
      children.splice(i, 1);
      unsubscribeActions(getRootElement(), child);
    }
  }

  // process result (creates or updates element.atom)
  resultToAtom(result, element);

  return element;
}

// for creating state obj at the top level & later rerun on update
function declareStateRoot(Component, state) {
  current = root;
  if (state === undefined) state = {};

  const key = {};
  isRendering = key;
  renderTime = Date.now();

  const rootElement = {
    component: Component,
    render: Component,
    props: undefined,
    key,
    children: [],
    uses: [],
    renderTime,
    parent: current,
    declared: true,
    atom: undefined,
    subs: new Map(),
  };
  console.log('STATE-TREE', 'mounting ROOT element', rootElement);
  current.children.push(rootElement);
  _declare(Component, {...state, key}, rootElement);

  const rootAtom = rootElement.atom;
  let result = getAtom(rootAtom);
  is(state, result);

  console.log(
    'STATE-TREE',
    'initial root render returned',
    result,
    'after',
    Date.now() - renderTime
  );
  isRendering = 0;

  on(rootAtom, result => {
    console.log('STATE-TREE', 'root atom update triggered!', result);
    is(state, result);
  });

  on(state, (_key, value, oldValue) => {
    // TODO because isRendering is not working for child component updates, we are getting redundant renders
    if (isRendering !== key && (oldValue === undefined || value !== oldValue)) {
      console.log('STATE-TREE', 'root render caused by', _key);
      isRendering = key;
      renderTime = Date.now();
      _declare(Component, {...state, key}, rootElement);
      let result = getAtom(rootAtom);
      is(state, result);
      isRendering = 0;
      console.log(
        'STATE-TREE',
        'root render returned',
        result,
        'after',
        Date.now() - renderTime
      );
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
    console.log(
      'STATE-TREE',
      'root render returned',
      result,
      'after',
      Date.now() - renderTime
    );
  });
}

function markForUpdate(element) {
  let parent = element;
  updateSet.add(parent);
  if (parent.declared) return parent;
  while (parent.parent !== root) {
    parent = parent.parent;
    updateSet.add(parent);
    if (parent.declared) return parent;
  }
  return parent;
}

function getRootElement() {
  // FIXME does not work anymore
  // return root.children.find(c => c.key === isRendering);
  return root.children[0]; // short term hack
}

function rerender(element) {
  isRendering = element.key;
  renderTime = Date.now();
  let result;
  if (element.declared) {
    console.log('STATE-TREE', 'rerendering', element);
    // current = rootElement.parent;
    _declare(
      element.component,
      {
        ...element.props,
        key: element.key,
      },
      element
    );
    result = getAtom(element.atom);
    update(element.atom);
    // current = root;
  } else {
    throw Error(
      'undeclared re-render! should not happen because used elements require update of parents'
    );
  }
  isRendering = 0;
  return result;
}

function dispatch(state, type, payload) {
  emit(state, 'dispatch', type, payload);
}

function dispatchFromRoot(rootElement, type, payload) {
  let subscribers = rootElement.subs.get(type);
  if (subscribers === undefined || subscribers.size === 0) return;

  let actionRoots = new Set();
  for (let element of subscribers) {
    actionRoots.add(markForUpdate(element));
  }
  currentAction = [type, payload];
  for (let rootElement of actionRoots) {
    console.log('STATE-TREE', 'branch render caused by dispatch', rootElement);
    let result = rerender(rootElement);
    console.log(
      'STATE-TREE',
      'branch render returned',
      result,
      'after',
      Date.now() - renderTime
    );
  }
  currentAction = [undefined, undefined];
}

function subscribeAction(rootElement, type, element) {
  let subscribers =
    rootElement.subs.get(type) ??
    rootElement.subs.set(type, new Set()).get(type);
  subscribers.add(element);
}
function unsubscribeActions(rootElement, element) {
  for (let entry of rootElement.subs) {
    let [key, set] = entry;
    set.delete(element);
    if (set.size === 0) {
      rootElement.subs.delete(key);
    }
  }
}

function useAction(type) {
  if (current === root)
    throw Error('useAction can only be called during render');
  let rootElement = getRootElement();
  subscribeAction(rootElement, type, current);
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

// TODO
function Merged(...objAtomArray) {
  let mergedObj = {};

  function updateValue() {
    Object.assign(
      mergedObj,
      ...objAtomArray.map(oa => (isAtom(oa) ? getAtom(oa) : oa))
    );
  }
  updateValue();

  let mergedAtom = Atom(mergedObj);

  for (let objAtom of objAtomArray) {
    if (!isAtom(objAtom)) continue;
    addAtomDep(objAtom, mergedAtom, () => {
      updateValue();
      update(mergedAtom);
    });
  }
  return mergedAtom;
}
