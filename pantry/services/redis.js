const client = require('redis').createClient({host: 'pantryredis'});
const { promisify } = require("util");

client.on('connect', () => {
    console.log('Redis client connected');
});

client.on("error", (error) => {
    console.error(error);
});

const get = promisify(client.get).bind(client);
const set = promisify(client.set).bind(client);

module.exports = {
    get,
    set,
};
