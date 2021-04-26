import base64 from 'compact-base64';

const parseParams = params => {
  return params.split('&').reduce(function (res, item) {
    const parts = item.split('=');
    const namespace = parts[0].split(".");
    if (namespace.length > 1) {
      res[decodeURIComponent(namespace[0])][decodeURIComponent(namespace[1])] = decodeURIComponent(parts[1]);
    } else {
      res["room"][decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
    }
    return res;
  }, {"room": {},
      "identity": {}});
};

export const parseUrlConfig = () => {
  const hashContent = location.hash.substr(1);
  const queryString = location.search.substr(1);

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

  return {}
};
