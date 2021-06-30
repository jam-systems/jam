// module to accumulate timeouts for an object
export {timeout, addTimeout, stopTimeout};

function timeout(object, delay, handler) {
  let context = timeoutContexts.get(object);
  if (context === undefined) {
    context = {};
    timeoutContexts.set(object, context);
  }
  clearTimeout(context.timeout);

  let now = Date.now();
  context.handler = handler ?? context.handler;
  context.timeoutStart = context.timeoutStart ?? now;
  delay = Math.max(0, (context.timeoutEnd ?? 0) - now, delay);
  context.timeoutEnd = now + delay;
  context.timeout = setTimeout(() => {
    let totalDuration = Date.now() - context.timeoutStart;
    context.timeout = null;
    context.timeoutStart = null;
    context.timeoutEnd = null;
    context.handler?.(totalDuration);
  }, delay);
}

function addTimeout(object, delay) {
  let context = timeoutContexts.get(object);
  if (context?.timeout) timeout(object, delay);
}

function stopTimeout(object) {
  let context = timeoutContexts.get(object);
  if (context === undefined) return;
  clearTimeout(context.timeout);
  context.timeout = null;
  context.timeoutStart = null;
  context.timeoutEnd = null;
}

const timeoutContexts = new WeakMap();
