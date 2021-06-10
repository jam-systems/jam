/*
I find myself writing complicated, custom logic again & again for the following generic problem:

* Complex JS objects from different sources have to be reduced into a new JS object (Object / Array / Map / Set / ...)
* One of the sources triggers an update
* I want to know whether the reduced object changed, and if not, keep using the old object
* Assume that the sources (but not the result) update frequently, so this should all happen as quick as possible

This lib is an attempt at collecting useful (partial) solutions, as they appear
*/

import {useState} from './state-tree';

export {useStableArray, useStableObject};

function useStableArray(newValue) {
  let [value, set] = useState(newValue);
  return arrayEqual(value, newValue) ? value : set(newValue);
}

function useStableObject(newValue) {
  let [value, set] = useState(newValue);
  return objectEqual(value, newValue) ? value : set(newValue);
}

function stableArray(oldArray, newArray) {
  return arrayEqual(oldArray, newArray) ? oldArray : newArray;
}

function stableObject(oldObject, newObject) {
  return objectEqual(oldObject, newObject) ? oldObject : newObject;
}

function arrayEqual(a, b) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function objectEqual(a, b) {
  if (a === b) return true;
  let keys = Object.keys(a);
  let length = keys.length;
  for (let i = 0; i < length; i++) {
    if (a[keys[i]] !== b[keys[i]]) return false;
  }
  return length === Object.keys(b).length;
}

// probably not useful to create a more generic version...

function useStable(newThing) {
  let [thing, setThing] = useState(newThing);

  let equal;
  if (Array.isArray(thing)) {
    equal = arrayEqual(thing, newThing);
  } else if (typeof thing === 'object') {
    equal = objectEqual(thing, newThing);
  } else {
    equal = thing === newThing;
  }
  if (equal) return thing;
  return setThing(newThing);
}

function stable(oldThing, newThing) {
  if (Array.isArray(oldThing)) return stableArray(oldThing, newThing);
  return stableObject(oldThing, newThing);
}
