import {useEffect} from 'react';
import State from './minimal-state';
import use from './use-state';

let state = State({});

export function useLocation() {
  use(state);
  useEffect(() => {
    window.addEventListener('popstate', () => {
      state.update();
    });
  });
  return location;
}

export function usePath() {
  return useLocation()
    .pathname.split('/')
    .filter(p => p);
}

export function navigate(route) {
  history.pushState(null, '', route);
  state.update();
}
