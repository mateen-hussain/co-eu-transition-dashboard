const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const MeasureValue = require('pages/data-entry-entity/measure-value/MeasureValue');
const authentication = require('services/authentication');
const entityUserPermissions = require('middleware/entityUserPermissions');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');

let page = {};
let res = {};
let req = {};

describe('pages/data-entry-entity/measure-value/MeasureValue', () => {
  beforeEach(() => {

    res = { cookies: sinon.stub(), redirect: sinon.stub(), render: sinon.stub(),   sendStatus: sinon.stub(), send: sinon.stub(), status: sinon.stub(), locals: {} };
    req = { body: {}, cookies: [], params: { groupId: 'group-1', metricId: 'measure-1', type: 'add' }, user: { roles: [] }, flash: sinon.stub() };
    res.status.returns(res);

    page = new MeasureValue('edit-value', req, res);

    sinon.stub(authentication, 'protect').returns([]);
    sinon.stub(entityUserPermissions, 'assignEntityIdsUserCanAccessToLocals');
  });

  afterEach(() => {
    authentication.protect.restore();
    entityUserPermissions.assignEntityIdsUserCanAccessToLocals.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.dataEntryEntity.measureValue);
    });
  });

  describe('#pathToBind', () => {
    it('returns correct url', () => {
      expect(page.pathToBind).to.eql(`${paths.dataEntryEntity.measureValue}/:measureId`);
    });
  });

  describe('#editUrl', () => {
    it('returns url for edit measure value', () => {
      expect(page.editUrl).to.eql(`${page.url}/${req.params.measureId}`);
    });
  });

  describe('#middleware', () => {
    it('only uploaders are allowed to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['uploader']),
        entityUserPermissions.assignEntityIdsUserCanAccessToLocals
      ]);

      sinon.assert.calledWith(authentication.protect, ['uploader']);
    });
  });

  describe('#getRequest', () => {
    it('responds with method not allowed if not admin and no entitiesUserCanAccess', async () => {
      page.res.locals.entitiesUserCanAccess = [];

      await page.getRequest(req, res);

      sinon.assert.calledWith(res.status, METHOD_NOT_ALLOWED);
      sinon.assert.calledWith(res.send, 'You do not have permisson to access this resource.');
    });
  });
});