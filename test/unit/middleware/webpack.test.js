const { sinon } = require('test/unit/util/chai');
const proxyquire = require('proxyquire');

const webpackHotHiddleware = sinon.stub().returns({});
const webpackDevMiddlewareStub = sinon.stub();
const webpack = proxyquire('middleware/webpack', {
  'webpack-dev-middleware': webpackDevMiddlewareStub,
  'webpack-hot-middleware': webpackHotHiddleware
});

let app = {};

describe('middleware/webpack', () => {
  before(() => {
    app.use = sinon.stub();
    webpack.configure(app);
  });

  it('attaches webpack dev middlware', () => {
    sinon.assert.calledOnce(webpackHotHiddleware);
  });

  it('attaches webpack hot middlware', () => {
    sinon.assert.calledOnce(webpackDevMiddlewareStub);
  });
});