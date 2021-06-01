import {use} from 'use-minimal-state';
import React, {createContext, useContext, useState} from 'react';

export {JamProvider, useJamState, useJam};

const JamContext = createContext([]);

// TODO: provider could also be able to create the state & render state root
// but more flexible is to create it outside somewhere

function JamProvider({children, state, api}) {
  let [value] = useState([state, api]);
  return <JamContext.Provider value={value}>{children}</JamContext.Provider>;
}

function useJam() {
  return useContext(JamContext);
}

function useJamState(keys) {
  let [state] = useContext(JamContext);
  return keys ? use(state, keys) : state;
}
