const LOGGING = false;

export default function State(initialState) {
  let map = new Map();

  let api = {
    // main API
    get: key => {
      return key == undefined ? state : state[key];
    },
    set(key, value) {
      state[key] = value;
      api.update(key);
    },
    update(key) {
      if (LOGGING) console.log('update', key, state[key]);
      if (key !== undefined) {
        api.emit(key, state[key]);
      }
      api.emit(undefined, state);
    },
    // lower level API, implements simple event emitter
    on(key, listener) {
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(listener);
    },
    off(key, listener) {
      let listeners = map.get(key);
      if (!listeners) return;
      listeners.delete(listener);
      if (listeners.size === 0) map.delete(key);
    },
    emit(key, ...args) {
      if (!map.has(key)) return;
      for (let listener of map.get(key)) {
        try {
          listener(...args);
        } catch (err) {
          console.error(err);
        }
      }
    },
    clear() {
      map.clear();
    },
    map,
  };

  let state = Object.assign(api, initialState);
  return state;
}
