export default function debounce(delay, func) {
  const debounceCache = new Map();

  let onTimeout = args => {
    let [, shouldCall] = debounceCache.get(args);

    if (shouldCall) {
      let timeout = setTimeout(() => onTimeout(args), delay);
      debounceCache.set(args, [timeout, false]);
      func(...args);
    } else {
      debounceCache.delete(args);
    }
  };

  function funcDebounced(...args) {
    let lastArgs, timeout, shouldCall;

    for (let entry of debounceCache) {
      let [args_, [timeout_, shouldCall_]] = entry;
      if (arrayEqual(args_, args)) {
        lastArgs = args_;
        timeout = timeout_;
        shouldCall = shouldCall_;
        break;
      }
    }
    if (timeout === undefined) {
      timeout = setTimeout(() => onTimeout(args), delay);
      debounceCache.set(args, [timeout, false]);
      func(...args);
    } else if (!shouldCall) {
      debounceCache.set(lastArgs, [timeout, true]);
    }
  }

  return funcDebounced;
}

function arrayEqual(a, b) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// let start = Date.now();
// let f = debounce(1000, () => {
//   console.log('called', Date.now() - start);
// });
// setInterval(() => {
//   f();
// }, 10);
