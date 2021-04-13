import State, {on, pure, set} from 'use-minimal-state';

export function StoredState(name, initialize = () => ({}), options) {
  let storedState = getStorage(localStorage, name);
  if (!storedState) {
    storedState = initialize();
    setStorage(localStorage, name, storedState);
  }
  let state = State(storedState, options);
  let forwardUpdates = true;
  on(state, () => {
    if (forwardUpdates) setStorage(localStorage, name, pure(state));
  });
  window.addEventListener('storage', event => {
    if (event.key === name) {
      forwardUpdates = false;
      try {
        let storedState = getStorage(localStorage, name) ?? initialize();
        for (let key in storedState) {
          let value = storedState[key];
          if (state[key] !== value) set(state, key, value);
        }
      } catch (_) {}
      forwardUpdates = true;
    }
  });
  return state;
}

export function getStorage(storage, key) {
  let content = parse(storage.getItem(key));
  if (content === null) content = undefined;
  return content;
}

export function setStorage(storage, key, value) {
  storage.setItem(key, JSON.stringify(value) ?? null);
}

export function updateStorage(storage, key, update) {
  let content = parse(storage.getItem(key));
  if (content === null) content = undefined;
  let newJson = JSON.stringify(update(content)) ?? null;
  storage.setItem(key, newJson);
}

function parse(json) {
  if (json === undefined) return;
  try {
    return JSON.parse(json);
  } catch (e) {}
}
