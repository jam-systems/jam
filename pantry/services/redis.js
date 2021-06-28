const {createNodeRedisClient} = require('handy-redis');
const {local} = require('../config');

const localStore = {};

let _exports = {
  get: key => localStore[key],
  set: (key, value) => (localStore[key] = value),
  del: key => {
    delete localStore[key];
  },
  list: prefix => Object.keys(localStore).filter(key => key.startsWith(prefix)),
  roomCount: () =>
    Object.keys(localStore).filter(key => key.startsWith('rooms/')).length,
  identityCount: () =>
    Object.keys(localStore).filter(key => key.startsWith('identities/')).length,
};

if (!local) {
  const client = createNodeRedisClient({host: '127.0.0.1', port: 6379});

  const roomCount = async () => (await client.keys('rooms/*')).length;
  const identityCount = async () => (await client.keys('identities/*')).length;
  const set = (key, value) => client.set(key, JSON.stringify(value));
  const get = async key => JSON.parse(await client.get(key));
  const del = key => client.del(key);
  const list = prefix => client.keys(`${prefix}*`);

  _exports = {
    get,
    set,
    del,
    list,
    roomCount,
    identityCount,
  };
}

module.exports = _exports;
