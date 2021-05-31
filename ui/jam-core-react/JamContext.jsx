import {use, is} from 'use-minimal-state';
import React, {createContext, useCallback, useContext, useState} from 'react';

export {ExistingStateProvider, useStateObject, useSetState, useJam};

const StateContext = createContext({});

// TODO: default provider should also *create* the state & render state root

function ExistingStateProvider({children, state, api}) {
  let [value] = useState({state, api});
  return (
    <StateContext.Provider value={value}>{children}</StateContext.Provider>
  );
}

function useJam() {
  let {state, api} = useContext(StateContext);
  return [state, api];
}

function useAppState(keys) {
  let {state} = useContext(StateContext);
  return use(state, keys);
}

function useStateObject() {
  let {state} = useContext(StateContext);
  return state;
}

function useSetState() {
  let {state} = useContext(StateContext);
  const setState = useCallback((...args) => is(state, ...args), [state]);
  return setState;
}
