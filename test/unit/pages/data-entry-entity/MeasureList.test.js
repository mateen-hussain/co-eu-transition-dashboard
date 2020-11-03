const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const config = require('config');
const MeasureList = require('pages/data-entry-entity/measure-list/MeasureList');
const authentication = require('services/authentication');
const filterMetrics = require('helpers/filterMetrics');
const measures = require('helpers/measures.js');

let page = {};
let res = {};
let req = {};

describe('pages/data-entry-entity/measure-list/MeasureList', () => {
  beforeEach(() => {

    res = { cookies: sinon.stub(), sendStatus: sinon.stub(), send: sinon.stub(), status: sinon.stub(), locals: {} };
    req = { cookies: [], query: { category: 'category' }, user: { roles: [], getPermittedMetricMap: sinon.stub().returns({}) } };
    res.status.returns(res);

    page = new MeasureList('some path', req, res);

    sinon.stub(authentication, 'protect').returns([]);
    sinon.stub(filterMetrics,'filterMetrics').returnsArg(1);
  });

  afterEach(() => {
    authentication.protect.restore();
    filterMetrics.filterMetrics.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.dataEntryEntity.measureList);
    });
  });

  describe('#middleware', () => {
    it('only uploaders are allowed to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['uploader'])
      ]);

      sinon.assert.calledWith(authentication.protect, ['uploader']);
    });
  });
  
  describe('#getMeasures', () => {
    const category = { id: 'some-category' };
    const measureEntities = [{ id: 'some-entity' }];
    const measureEntitiesGrouped = [{
      id: 'some-entity',
      children: [{
        id: 'some-entity-1'
      },{
        id: 'some-entity-2'
      }]
    },{
      id: 'some-entity',
      children: [{
        id: 'some-entity-1'
      }]
    }];

    let getCategoryStub;
    let getMeasureEntitiesStub;
    let groupMeasuresStub;
    beforeEach(() => {
      getCategoryStub = sinon.stub(measures, 'getCategory');
      getCategoryStub.onFirstCall().returns(category);
      getCategoryStub.onSecondCall().returns(category);
      getMeasureEntitiesStub = sinon.stub(measures,'getMeasureEntities').returns(measureEntities);
      groupMeasuresStub = sinon.stub(measures,'groupMeasures').returns(measureEntitiesGrouped);
    });

    afterEach(()=>{
      measures.getCategory.restore();
      measures.getMeasureEntities.restore();
      measures.groupMeasures.restore();
    })

    it('orchastrates getting measures and applying rayg colours', async () => {
      const measures = await page.getMeasures();

      sinon.assert.callCount(getCategoryStub,  2);
      sinon.assert.calledWith(getMeasureEntitiesStub, {
        measureCategory: category, 
        themeCategory: category, 
        user: page.req.user
      });
      sinon.assert.calledWith(groupMeasuresStub, measureEntities);

      expect(measures).to.eql({
        grouped: [measureEntitiesGrouped[0]],
        notGrouped: [measureEntitiesGrouped[1]],
      });
    });
  });

  describe('#isEnabled', () => {
    let sandbox = {};
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should be enabled if measureUpload feature is active', () => {
      sandbox.stub(config, 'features').value({
        measureUpload: true
      });

      expect(MeasureList.isEnabled).to.be.ok;
    });

    it('should be enabled if measureUpload feature is not active', () => {
      sandbox.stub(config, 'features').value({
        measureUpload: false
      });

      expect(MeasureList.isEnabled).to.not.be.ok;
    });
  });
});
