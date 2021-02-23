const {createNodeRedisClient} = require('handy-redis');
const {local} = require("../config");

const localStore = {};

let _exports = {
    get: (key) => localStore[key],
    set: (key, value) => localStore[key] = value,
    roomCount: () => Object.keys(localStore).filter((key) => key.startsWith("rooms/")).length,
    identityCount: () => Object.keys(localStore).filter((key) => key.startsWith("identities/")).length
}

if(!local) {
    const client = createNodeRedisClient({host: 'pantryredis'});

    const roomCount = async () => (await client.keys("rooms/*")).length;
    const identityCount = async () => (await client.keys("identities/*")).length;
    const set = (key, value) => client.set(key, JSON.stringify(value));
    const get = async (key) => JSON.parse(await clinet.get(key));

    _exports = {
        get,
        set,
        roomCount,
        identityCount
    };

}


module.exports = _exports;
