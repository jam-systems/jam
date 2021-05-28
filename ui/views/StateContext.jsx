import {use, is} from 'use-minimal-state';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

export {
  ExistingStateProvider,
  useAppState,
  useStateObject,
  useSetState,
  useDispatchState,
  StateContext,
};

const StateContext = createContext({});

// TODO: default provider should also *create* the state & render state root

function ExistingStateProvider({children, state, dispatch}) {
  let [value, setValue] = useState({state, dispatch});
  useEffect(() => {
    setValue({state, dispatch});
  }, [state, dispatch]);

  return (
    <StateContext.Provider value={value}>{children}</StateContext.Provider>
  );
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
function useDispatchState() {
  let {dispatch} = useContext(StateContext);
  return dispatch;
}
