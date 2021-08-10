import {use} from 'use-minimal-state';
import React, {createContext, useContext, useMemo} from 'react';
import {
  createApi,
  createJam,
  ActionType,
  StateType,
  defaultState,
  Props,
} from '../jam-core';

export {JamProvider, useJamState, useJam};

// intial context values to infer types
let fakeDispatch = async (type: ActionType, payload?: unknown) => {
  throw Error('state not created yet');
};
let fakeSetProps = async (state: Partial<Props>) => {
  throw Error('state not created yet');
};
const defaultApi = createApi(defaultState, fakeDispatch, fakeSetProps);
const JamContext = createContext([defaultState, defaultApi] as const);

// TODO: provider could also be able to create the state & render state root
// but more flexible is to create it outside somewhere

function JamProvider({
  children,
  state,
  api,
  options,
  onState,
}: {
  children: React.ReactChildren;
  state: StateType;
  api: typeof defaultApi;
  options: Parameters<typeof createJam>[0];
  onState: (state: StateType) => void;
}) {
  let value = useMemo(() => {
    if (state === undefined) {
      [state, api] = createJam(options);
    }
    onState?.(state);
    return [state, api] as const;
  }, []);
  return <JamContext.Provider value={value}>{children}</JamContext.Provider>;
}

function useJam() {
  return useContext(JamContext);
}

type T = StateType;
function useJamState<K extends keyof T>(key: K): T[K];
function useJamState<
  K extends readonly [keyof T, ...(keyof T)[]] | readonly (keyof T)[]
>(
  keys: K
): {
  [P in keyof K]: T[K[P] extends keyof T ? K[P] : never];
};
function useJamState(): T;
function useJamState(keys?: any) {
  let [state] = useContext(JamContext);
  return use(state, keys) as never;
}
