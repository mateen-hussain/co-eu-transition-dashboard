const redis = require("redis");
const config = require('config');
const logger = require('services/logger');
const { promisify } = require("util");

let redisUrl = config.services.redis.url;

if(config.services.vcapServices && config.services.vcapServices.redis.length) {
  redisUrl = config.services.vcapServices.redis[0].credentials.uri;
}

const client = redis.createClient({
  url: redisUrl
});

client.on("error", function(error) {
  logger.error(error);
});

const clearCache = async () => {
  client.flushall();
};

const clearCacheMiddleware = async (req, res, next) => {
  await clearCache();
  next();
};

const set = async (key, value) => {
  client.set(key, value);
};

const get = async (key) => {
  const getAsync = promisify(client.get).bind(client);
  return await getAsync(key);
};

module.exports = {
  clearCache,
  clearCacheMiddleware,
  set,
  get
};