const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const jwt = require('services/jwt');
const proxyquire = require('proxyquire');
const moment = require('moment');

let page = {};
let filtersStub = {};
let getProjects = {};

describe('pages/all-data/AllData', () => {
  beforeEach(() => {
    filtersStub = sinon.stub();
    const AllData = proxyquire('pages/all-data/AllData', {
      'helpers/filters': {
        getFilters: filtersStub
      }
    });

    const res = { cookies: sinon.stub() };

    getProjects = sinon.stub();
    const req = { cookies: [], user: { getProjects }};

    page = new AllData('some path', req, res);

    sinon.stub(jwt, 'restoreData');
  });

  afterEach(() => {
    jwt.restoreData.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.allData);
    });
  });

  describe('#schema', () => {
    it('returns the correct data schema', () => {
      expect(page.schema).to.eql({
        filters: {
          date: ['01/01/2020', '01/01/2021']
        }
      });
    });
  });

  describe('#projects', () => {
    it('gets projects for users', async () => {
      getProjects.resolves('some response');
      const projects = await page.projects();
      expect(projects).to.eql('some response');
    });
  });

  describe('#filters', () => {
    it('should call the filters helper function', async () => {
      await page.filters();
      return sinon.assert.calledWith(filtersStub, { date: ['01/01/2020', '01/01/2021'] });
    });
  });

  describe('#currentDate', () => {
    it('should return the current date', () => {
      expect(page.currentDate).to.eql(moment().format());
    });
  });

  describe('#getFilter', () => {
    it('should return the correct filter name when passed in an ID', () => {
      const id = 'test_1';
      const name = 'Test 1';
      expect(page.getFilter(id, [{
        id, name
      }])).to.eql({
        id, name
      });
    });
  });
});
