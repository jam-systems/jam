import {useState, useEffect} from 'react';

export default function use(state, key) {
  let [, setState] = useState(0);
  useEffect(() => {
    let isOff = false;
    let updater = () => {
      if (!isOff) setState(n => n + 1);
    };
    state.on(key, updater);
    return () => {
      isOff = true;
      state.off(key, updater);
    };
  }, [key]);
  return state.get(key);
}
