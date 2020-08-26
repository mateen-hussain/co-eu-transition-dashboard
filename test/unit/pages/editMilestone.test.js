const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const EditMilestone = require('pages/edit-milestone/EditMilestone');
const Milestone = require('models/milestone');
const authentication = require('services/authentication');
const flash = require('middleware/flash');
const jwt = require('services/jwt');
const sequelize = require('services/sequelize');
const validation = require('helpers/validation');

let page = {};
let res = {};
let req = {};

describe('pages/edit-milestone/EditMilestone', () => {
  beforeEach(() => {
    res = { redirect: sinon.stub(), render: sinon.stub() };
    req = { user: { getProjects: sinon.stub(), getProjectMilestone: sinon.stub() }, flash: sinon.stub(), originalUrl: 'originalUrl' };

    page = new EditMilestone('some path', res, req);

    page.res = res;
    page.req = req;

    sinon.stub(authentication, 'protect').returns([]);
    sinon.stub(jwt, 'restoreData').returns();
  });

  afterEach(() => {
    authentication.protect.restore();
    jwt.restoreData.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.editMilestone);
    });
  });

  describe('#pathToBind', () => {
    it('returns correct url with params', () => {
      expect(page.pathToBind).to.eql(`${paths.editMilestone}/:uid/:edit(edit)?/:successful(successful)?`);
    });
  });

  describe('#editMode', () => {
    it('returns true when in edit mode', () => {
      page.req.params = { uid: 'someid', edit: 'edit' };
      expect(page.editMode).to.be.ok;
    });

    it('returns false when not in edit mode', () => {
      expect(page.editMode).to.be.not.ok;
    });
  });

  describe('#signOffMode', () => {
    it('returns true when in sign off mode', () => {
      page.req.params = { uid: 'someid' };
      expect(page.signOffMode).to.be.ok;
    });

    it('returns false when not in sign off mode', () => {
      expect(page.signOffMode).to.be.not.ok;
    });
  });

  describe('#successfulMode', () => {
    it('returns true when in successful mode', () => {
      page.req.params = { uid: '123', successful: 'successful' };
      expect(page.successfulMode).to.be.ok;
    });

    it('returns false when not in successful mode', () => {
      expect(page.successfulMode).to.be.not.ok;
    });
  });

  describe('#next', () => {
    it('redirects to successfulMode', () => {
      page.req.params = { uid: 'someid', edit: 'edit' };
      page.next();
      sinon.assert.calledWith(page.res.redirect, page.successfulModeUrl);
    });

    it('redirects to successfulMode', () => {
      page.req.params = {};
      page.next();
      sinon.assert.calledWith(page.res.redirect, page.signOffUrl);
    });
  });

  describe('#middleware', () => {
    it('only uploaders are allowed to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['uploader']),
        flash
      ]);

      sinon.assert.calledWith(authentication.protect, ['uploader']);
    });
  });

  describe('#getRequest', () => {
    it('sets data if edit mode', async () => {
      page.data = { uid: 1 };
      page.req.params = { uid: 1, edit: true };
      page.clearData = sinon.stub();
      page.setData = sinon.stub();

      await page.getRequest(req, res);

      sinon.assert.calledOnce(page.setData);
      sinon.assert.notCalled(page.clearData);
    });

    it('clear data if not edit mode', async () => {
      page.req.params = { uid: 1 };
      page.clearData = sinon.stub();
      page.setData = sinon.stub();

      await page.getRequest(req, res);

      sinon.assert.calledOnce(page.clearData);
      sinon.assert.notCalled(page.setData);
    });
  });

  describe('#saveFieldToDatabase', () => {
    it('saves data to database', async () => {
      page.next = sinon.stub();
      const transaction = {
        commit: sinon.stub(),
        rollback: sinon.stub()
      };
      sequelize.transaction.returns(transaction);

      Milestone.import = sinon.stub();
      Milestone.fieldDefinitions = sinon.stub().returns('fields');

      const milestone = { uid: 'uid' };

      await page.saveFieldToDatabase(milestone);

      sinon.assert.calledWith(Milestone.import, milestone, 'fields', { transaction });
      sinon.assert.calledOnce(page.next);
      sinon.assert.calledOnce(transaction.commit);
    });

    it('redirects with error if problem', async () => {
      page.next = sinon.stub();
      const transaction = {
        commit: sinon.stub(),
        rollback: sinon.stub()
      };
      sequelize.transaction.returns(transaction);

      Milestone.import = sinon.stub().throws(new Error('error'));
      Milestone.fieldDefinitions = sinon.stub().returns('fields');

      const milestone = { uid: 'uid' };

      await page.saveFieldToDatabase(milestone);

      sinon.assert.calledWith(page.res.redirect, page.req.originalUrl);
      sinon.assert.calledOnce(transaction.rollback);
    });
  });

  describe('#validateMilestone', () => {
    beforeEach(() => {
      const fields = [
        { type: 'date', name: 'date', importColumnName: 'date' },
        { type: 'string', name: 'name', importColumnName: 'name' },
      ];
      Milestone.fieldDefinitions = sinon.stub().returns(fields);
      sinon.stub(validation, 'validateItems');

    });

    afterEach(() => {
      validation.validateItems.restore();
    });

    it('returns error messages for invalid fields', async () => {
      const errors = [{
        itemDefinition: {
          importColumnName: 'name'
        },
        error: 'some error'
      }]
      validation.validateItems.returns(errors);

      const milestone = {
        date: '20/04/2020',
        name: 'some name'
      };

      const errorMessage = await page.validateMilestone(milestone);

      expect(errorMessage).to.eql('name: some error<br>');
    });

    it('returns no message if all valid', async () => {
      validation.validateItems.returns([]);

      const milestone = {
        date: '20/04/2020',
        name: 'some name'
      };

      const errorMessage = await page.validateMilestone(milestone);

      expect(errorMessage).to.not.be.ok;
    });
  });

  describe('#postRequest', () => {
    beforeEach(() => {
      sinon.stub(page, 'saveData');
      sinon.stub(page, 'validateMilestone');
      sinon.stub(page, 'saveFieldToDatabase');
    });

    it('redirects to original url with errors', async () => {
      page.req.params = { uid: 'someid', edit: 'edit' };
      page.validateMilestone.returns('some error');

      await page.postRequest(req, res);

      sinon.assert.calledOnce(page.saveData);
      sinon.assert.calledWith(page.req.flash, 'some error');
      sinon.assert.calledWith(page.res.redirect, page.req.originalUrl);
    });

    it('redirects to original url without errors', async () => {
      page.req.params = { uid: 'someid', edit: 'edit' };

      await page.postRequest(req, res);

      sinon.assert.calledOnce(page.saveData);
      sinon.assert.notCalled(page.req.flash);
      sinon.assert.notCalled(page.res.redirect);
      sinon.assert.calledOnce(page.saveFieldToDatabase);
    });

    it('redirect to original url if no edit mode', async () => {
      page.req.params = {};

      await page.postRequest(req, res);

      sinon.assert.notCalled(page.saveData);
      sinon.assert.notCalled(page.req.flash);
      sinon.assert.notCalled(page.saveFieldToDatabase);
      sinon.assert.calledWith(page.res.redirect, page.req.originalUrl);
    });
  });

  describe('#setData', () => {
    beforeEach(() => {
      page.req.params = { uid: 1 };
      sinon.stub(page, 'clearData');
      sinon.stub(page, 'saveData');

      req.user.getProjectMilestone.returns({
        project: {},
        milestone: {
          fields: {
            get: sinon.stub().returns({ value: 'value' })
          }
        }
      });

      Milestone.fieldDefinitions = sinon.stub().returns([{
        name: 'projectUid',
        config: {}
      }]);
    });

    it('sets data', async () => {
      await page.setData();

      sinon.assert.calledOnce(page.clearData);
      sinon.assert.calledWith(page.saveData, { projectUid: "value" });
    });
  });

  describe('#transformDeliveryConfidenceValue', () => {
    it(`Transforms Delivery Confidence Value of 0 to "0 - Very low confidence"`, async () => {
      expect(page.transformDeliveryConfidenceValue(0)).to.eql("0 - Very low confidence");
    });

    it(`Transforms Delivery Confidence Value of 1 to "1 - Low confidence"`, async () => {
      expect(page.transformDeliveryConfidenceValue(1)).to.eql("1 - Low confidence");
    });

    it(`Transforms Delivery Confidence Value of 2 to "2 - Medium confidence"`, async () => {
      expect(page.transformDeliveryConfidenceValue(2)).to.eql("2 - Medium confidence");
    });

    it(`Transforms Delivery Confidence Value of 3 to "3 - High confidence"`, async () => {
      expect(page.transformDeliveryConfidenceValue(3)).to.eql("3 - High confidence");
    });

    it(`returns default if no value given "No level given"`, async () => {
      expect(page.transformDeliveryConfidenceValue()).to.eql("No level given");
    });
  });

  describe('#getMilestoneFields', () => {
    it('returns milestone field defintions', async () => {
      Milestone.fieldDefinitions = sinon.stub().returns([{
        name: 'projectUid',
        config: {}
      }]);
      page.req.user.getProjects.returns([{ uid: 1 }])

      const response = await page.getMilestoneFields();

      expect(response).to.eql([{
        name: 'projectUid',
        type: 'group',
        config: { options: [1] }
      }]);
      sinon.assert.called(Milestone.fieldDefinitions);
    });
  });
});