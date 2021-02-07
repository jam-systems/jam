const redis = require('redis');
const { promisify } = require("util");
const LOCAL = false;

const localStore = {};

let _exports = {
    get: (key) => localStore[key],
    set: (key, value) => localStore[key] = value
}

if(!LOCAL) {
    const client = redis.createClient({host: 'pantryredis'});


    client.on('connect', () => {
        console.log('Redis client connected');
    });

    client.on("error", (error) => {
        console.error(error);
    });
    const _get = promisify(client.get).bind(client);
    const _set = promisify(client.set).bind(client);

    const set = (key, value) => _set(key, JSON.stringify(value));
    const get = async (key) => JSON.parse(await _get(key));

    _exports = {
        get,
        set,
    };

}


module.exports = _exports;
