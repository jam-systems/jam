import base64 from 'compact-base64';

const parseParams = params => {
  return params.split('&').reduce(function (res, item) {
    var parts = item.split('=');
    res[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
    return res;
  }, {});
};

export const parseUrlHash = () => {
  const hashContent = location.hash.substr(1);
  try {
    return JSON.parse(base64.decodeUrl(hashContent));
  } catch {
    return {
      room: parseParams(hashContent),
    };
  }
};
