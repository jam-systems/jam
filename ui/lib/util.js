export {arrayRemove, mergeObject, domEvent, mergeClasses};

function arrayRemove(arr, el) {
  let i = arr.indexOf(el);
  if (i !== -1) arr.splice(i, 1);
}

function mergeObject(obj, partialObj) {
  for (let key in partialObj) {
    let value = partialObj[key];
    if (value !== undefined) {
      obj[key] = value;
    }
  }
}

function filterInPlace(arr, filter) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (!filter(arr[i])) arr.splice(i, 1);
  }
}

function domEvent(el, event) {
  return new Promise(resolve => {
    el.addEventListener(event, function onEvent() {
      el.removeEventListener(event, onEvent);
      resolve();
    });
  });
}

function mergeClasses(...classes) {
  return classes.filter(x => x).join(' ');
}
