import {on} from 'minimal-state';

export {arrayRemove, debug};

function arrayRemove(arr, el) {
  let i = arr.indexOf(el);
  if (i !== -1) arr.splice(i, 1);
}

function debug(state) {
  let timeout = null;
  on(state, (key, value, oldValue) => {
    clearTimeout(timeout);
    setTimeout(() => {
      console.log('\n----------------\n\n');
    }, 10);
    if (oldValue !== undefined) {
      console.log(key, oldValue, '->', value);
    } else {
      console.log(key, value);
    }
  });
}
