import React from 'react';
import {on, use as useMinimalState} from 'use-minimal-state';
import {cleanup, log, root, _run} from './state-tree';

/* TODOs:

  - make components in use() be able to useAction

  - add more API for using state-tree inside React components, i.e.
    * useStateRoot(Component, props) which is like declareStateRoot & updates React component w/ state
    * something like declare() for self-contained effects which can take props but don't return anything
    * check whether declare / use could work w/ changing components, this works in state-tree but not in React bc
      we fix reference to fragment
*/

export {use};

// this works equivalently in React & state-tree components
function use(Component, props, stableProps) {
  let isComponent = typeof Component === 'function';
  if (isComponent) {
    // eslint-disable-next-line
    return useStateComponent(Component, props, stableProps);
  } else {
    // eslint-disable-next-line
    return useMinimalState(Component, props);
  }
}

// TODO: investigate whether the Component can be made changeable

function useStateComponent(Component, props, stableProps) {
  // a stable object which we use as render key and to store mutable state
  let [stable] = React.useState({
    shouldRun: true,
    element: null,
    component: Component,
  });
  if (props) props.key = stable;
  else props = {key: stable};

  if (stable.shouldRun) {
    let {component} = stable;
    let element = root.children.find(
      c => c.component === component && c.key === stable
    );
    [element] = _run(component, props, {element, stableProps});
    stable.element = element;
  }
  stable.shouldRun = true;

  let [, forceUpdate] = React.useState(0);

  React.useEffect(() => {
    let {element} = stable;
    on(element.fragment, () => {
      log('React update', stable.component.name);
      stable.shouldRun = false;
      forceUpdate(n => n + 1);
    });
    return () => {
      cleanup(element);
      let i = root.children.indexOf(element);
      if (i !== -1) root.children.splice(i, 1);
    };
  }, [stable]);
  return stable.element.fragment[0];
}
