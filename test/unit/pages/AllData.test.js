const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const jwt = require('services/jwt');
const proxyquire = require('proxyquire');
const moment = require('moment');
const sequelize = require('services/sequelize');
const authentication = require('services/authentication');

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

    const req = { cookies: [], user: { getProjects } };

    page = new AllData('some path', req, res);

    sinon.stub(authentication, 'protect').returns([]);

    sinon.stub(jwt, 'restoreData');
  });

  afterEach(() => {
    jwt.restoreData.restore();
    authentication.protect.restore();
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

  it('only management are allowed to access this page', () => {
    expect(page.middleware).to.eql([
      ...authentication.protect(['management'])
    ]);

    sinon.assert.calledWith(authentication.protect, ['management']);
  });

  describe('#getLastUpdatedAt', () => {
    beforeEach(() => {
      sequelize.query.resolves([[{ updated_at: 'some date' }]]);
    });

    it('calls sequelize.query with correct query and returns date', async () => {
      const date = await page.getLastUpdatedAt();

      expect(date).to.eql('some date');
      sinon.assert.calledWith(sequelize.query, `
      SELECT MAX(updated_at) AS updated_at
      FROM (
        SELECT updated_at
        FROM project
        UNION ALL SELECT updated_at FROM milestone
        UNION ALL SELECT updated_at FROM project_field_entry
        UNION ALL SELECT updated_at FROM milestone_field_entry
      ) AS updated_at`);
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
      expect(page.currentDate).to.eql(moment().format('DD/MM/YYYY'));
    });
  });

  describe('#tableFields', () => {
    it('should not return the department if departmental view', () => {
      page.req.user.isDepartmentalViewer = true;
      expect(page.tableFields).to.eql(['uid', 'title', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence']);
    });

    it('should not return the departmentName if not departmental view', () => {
      page.req.user.isDepartmentalViewer = false;
      expect(page.tableFields).to.eql(['uid', 'title', 'departmentName', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence']);
    });
  });
});
