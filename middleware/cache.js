const preventCache = app => {
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag
  app.set('etag', false);

  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
  // disable cache for all requests except `express.static()`
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  });
};

module.exports = { preventCache };