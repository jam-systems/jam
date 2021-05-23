import base64 from 'compact-base64';

export {parsePath, parseUrlConfig};

function parsePath(pathname) {
  let [first = null, second] = pathname.split('/').filter(identity);
  let stageOnly = first === 's';
  // other special configs go here
  let route = stageOnly ? second : first;
  let room = {stageOnly};
  return {route, room};
}

function parseUrlConfig(search, hash) {
  const hashContent = hash.slice(1);
  const queryString = search.slice(1);

  if (hashContent) {
    try {
      return JSON.parse(base64.decodeUrl(hashContent));
    } catch {
      return parseParams(hashContent);
    }
  }

  if (queryString) {
    return parseParams(queryString);
  }

  return {};
}

function parseParams(params) {
  return params.split('&').reduce((res, item) => {
    let [key, value] = item.split('=').map(decodeURIComponent);

    // backwards compatibility, maybe remove later
    if (key === 'name' || key === 'displayName' || key === 'description') {
      key = 'room.' + key;
    }

    const namespace = key.split('.');
    key = namespace.pop();
    let obj = res;
    for (let prop of namespace) {
      if (obj[prop] === undefined) obj[prop] = {};
      obj = obj[prop];
    }
    obj[key] = value;
    return res;
  }, {});
}

const identity = x => x;
