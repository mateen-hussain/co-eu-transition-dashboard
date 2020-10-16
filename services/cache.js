const redis = require("redis");
const config = require('config');
const logger = require('services/logger');
const { promisify } = require("util");

let redisUrl = config.services.redis.url;

if(config.services.vcapServices && config.services.vcapServices.redis.length) {
  redisUrl = config.services.vcapServices.redis[0].credentials.uri;
}

if (!redisUrl) {
  logger.error('Cache not active, no redis url supplied');
  return module.exports = {
    set: () => {},
    get: () => {},
    clear: () => {}
  };
}

const client = redis.createClient({
  url: redisUrl
});

client.on("error", function(error) {
  logger.error(error);
});

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

const clear = () => {
  client.flushall();
};

module.exports = {
  set,
  get,
  clear
};
