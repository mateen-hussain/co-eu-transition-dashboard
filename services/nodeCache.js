const NodeCache = require( "node-cache" );

const cache = new NodeCache( { stdTTL: 0 } );
const clearCache = (req, res, next) => {
  cache.flushAll();
  next();
};

module.exports = {
  cache,
  clearCache
}

