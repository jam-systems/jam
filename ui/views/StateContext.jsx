import {use, is} from 'use-minimal-state';
import React, {createContext, useCallback, useContext} from 'react';

export {
  ExistingStateProvider,
  useAppState,
  useStateObject,
  useSetState,
  StateContext,
};

const StateContext = createContext({});

// TODO: default provider should also *create* the state & render state root

function ExistingStateProvider({children, state}) {
  return (
    <StateContext.Provider value={state}>{children}</StateContext.Provider>
  );
}

function useAppState(keys) {
  let state = useContext(StateContext);
  return use(state, keys);
}

function useStateObject() {
  let state = useContext(StateContext);
  return state;
}

function useSetState() {
  let state = useContext(StateContext);
  const setState = useCallback((...args) => is(state, ...args), [state]);
  return setState;
}
