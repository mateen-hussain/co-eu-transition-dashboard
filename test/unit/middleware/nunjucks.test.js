const { sinon } = require('test/unit/util/chai');
const path = require('path');
const proxyquire = require('proxyquire');

const addFilter = sinon.stub()
const expressNunjucksStub = sinon.stub().returns({
  env: {
    addFilter
  }
});
const nunjucksAwaitFilterStub = sinon.stub();
const nunjucksDateFilterStub = sinon.stub();
const nunjucks = proxyquire('middleware/nunjucks', {
  'express-nunjucks': expressNunjucksStub,
  'nunjucks-await-filter': nunjucksAwaitFilterStub,
  'nunjucks-date-filter': nunjucksDateFilterStub
});

const viewsToInclude = [
  path.join(__dirname, '../../..', 'node_modules', 'govuk-frontend'),
  path.join(__dirname, '../../..', 'common', 'views'),
  path.join(__dirname, '../../..', 'common', 'views'),
  path.join(__dirname, '../../..', 'pages')
];

let app = {};


describe('middleware/nunjucks', () => {
  describe('#attach', () => {
    before(() => {
      app.set = sinon.stub();

      nunjucks.attach(app);
    });

    it('adds correct views', () => {
      sinon.assert.calledWith(app.set, 'views', viewsToInclude);
    });

    it('executes espress nunjucks', () => {
      sinon.assert.calledOnce(expressNunjucksStub);
    });

    it('executes await filter', () => {
      sinon.assert.calledOnce(nunjucksAwaitFilterStub);
    });

    it('executes date filter', () => {
      sinon.assert.calledWith(addFilter, 'date', nunjucksDateFilterStub);
    });

  });
});