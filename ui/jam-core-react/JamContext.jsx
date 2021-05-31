import {use} from 'use-minimal-state';
import React, {createContext, useContext, useState} from 'react';

export {ExistingStateProvider, useJamState, useJam};

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

function useJamState(keys) {
  let {state} = useContext(StateContext);
  return keys ? use(state, keys) : state;
}
