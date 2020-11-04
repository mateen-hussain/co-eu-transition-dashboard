const redis = require("redis");
const config = require('config');
const logger = require('services/logger');
const moment = require('moment');
const { promisify } = require("util");

let redisUrl = config.services.redis.url;

if(config.services.vcapServices && config.services.vcapServices.redis.length) {
  redisUrl = config.services.vcapServices.redis[0].credentials.uri;
}

if (!redisUrl) {
  logger.error('Cache not active, no redis url supplied');
  module.exports = {
    set: () => {},
    get: () => {},
    clear: () => {}
  };
} else {
  const client = redis.createClient({
    url: redisUrl
  });

  client.on("error", function(error) {
    logger.error(error);
  });

  const set = async (key, value) => {
    // set cache to expire at 5PM of that day, when called before 5PM, else set to 5PM of next day
    const expiresAt = (moment().hour() > 17)? moment().add(1, 'd').set('h', 17).set('m', 0) : moment().set('h', 17).set('m', 0);
    client.set(key, value);
    client.expireat(key, expiresAt.unix());
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
}
