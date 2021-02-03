const client = require('redis').createClient({host: 'pantryredis'});
const { promisify } = require("util");

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

module.exports = {
    get,
    set,
};
