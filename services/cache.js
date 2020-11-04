const redis = require("redis");
const config = require('config');
const logger = require('services/logger');
const { promisify } = require("util");
const nodeCache = require( "file-system-cache" );

let redisUrl = config.services.redis.url;

if(config.services.vcapServices && config.services.vcapServices.redis.length) {
  redisUrl = config.services.vcapServices.redis[0].credentials.uri;
}

if (redisUrl) {
  const client = redis.createClient({
    url: redisUrl
  });
  client.on("error", logger.error);

  const set = async (key, value, momentDate) => {
    client.set(key, value);
    if(momentDate) {
      client.expireat(key, momentDate.unix());
    }
  };

  const get = async (key) => {
    const getAsync = promisify(client.get).bind(client);
    return await getAsync(key);
  };

  const clear = () => client.flushall();

  module.exports = {
    set,
    get,
    clear
  };
} else {
  logger.error('Redis not active, reverting to local cache');

  const myCache = nodeCache.default({ basePath: "./.cache" });
  const set = (key, value) => myCache.set(key, value);
  const get = async (key) => await myCache.get(key);
  const clear = () => myCache.clear();

  module.exports = { set, get, clear };
}
