export function getStorage(storage, key) {
  let content = parse(storage.getItem(key));
  if (content === null) content = undefined;
  return content;
}

export function updateStorage(storage, key, update) {
  let content = parse(storage.getItem(key));
  if (content === null) content = undefined;
  let newJson = JSON.stringify(update(content)) || '';
  storage.setItem(key, newJson);
}

function parse(json) {
  if (json === undefined) return;
  try {
    return JSON.parse(json);
  } catch (e) {}
}
