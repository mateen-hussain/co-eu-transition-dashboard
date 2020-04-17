const { sinon } = require('test/unit/util/chai');
const cache = require('middleware/cache');

let app = {};

describe('middleware/cache', () => {
  beforeEach(() => {
    app = {
      use: sinon.stub(),
      set: sinon.stub()
    };
  });

  it('disables etag', () => {
    cache.preventCache(app);

    sinon.assert.calledWith(app.set, 'etag', false);
  });

  it('adds correct cache headers middleware', () => {
    const req = {};
    const res = { set: sinon.stub() };
    const next = sinon.stub();

    cache.preventCache(app);

    const middleware = app.use.getCall(0).args[0];
    middleware(req, res, next);

    sinon.assert.calledOnce(app.use);
    sinon.assert.calledWith(res.set, 'Cache-Control', 'no-store');
    sinon.assert.calledOnce(next);
  });
})