const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const jwt = require('services/jwt');
const proxyquire = require('proxyquire');
const moment = require('moment');

let page = {};
let filtersStub = {};
let getProjects = {};
let departmentalView = {}

describe('pages/all-data/AllData', () => {
  beforeEach(() => {
    filtersStub = sinon.stub();
    const AllData = proxyquire('pages/all-data/AllData', {
      'helpers/filters': {
        getFilters: filtersStub
      }
    });

    const res = { cookies: sinon.stub(), locals: { departmentalView } };

    getProjects = sinon.stub();
    departmentalView = sinon.stub();

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
      expect(page.schema).to.eql({ filters: {} });
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
      return sinon.assert.calledWith(filtersStub, {});
    });
  });

  describe('#currentDate', () => {
    it('should return the current date', () => {
      expect(page.currentDate).to.eql(moment().format());
    });
  });

  describe('#tableFields', () => {
    it('should not return the department if departmental view', () => {
      expect(page.tableFields).to.eql(['uid', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence']);
    });
  });
});
