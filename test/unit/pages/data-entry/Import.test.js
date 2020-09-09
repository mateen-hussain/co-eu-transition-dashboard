const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const proxyquire = require('proxyquire');
const flash = require('middleware/flash');
const Project = require('models/project');
const Milestone = require('models/milestone');
const sequelize = require('services/sequelize');
const validation = require('helpers/validation');
const parse = require('helpers/parse');
const BulkImport = require('models/bulkImport');

const fileUploadMock = sinon.stub();
fileUploadMock.returns(fileUploadMock);

const Import = proxyquire('pages/data-entry/import/Import', {
  'express-fileupload': fileUploadMock
});

let page = {};
let req = {};
let res = {};

describe('pages/data-entry/import/Import', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub(), redirect: sinon.stub(), render: sinon.stub() };
    req = { cookies: [], user: { id: 1 }, flash: sinon.stub() };

    page = new Import('some path', req, res);
    page.req = req;
    page.res = res;

    sinon.stub(authentication, 'protect').returns([]);

    sinon.stub(validation, 'validateColumns');
    sinon.stub(validation, 'validateItems');
    sinon.stub(validation, 'validateSheetNames');
    sinon.stub(parse, 'parseItems');
  });

  afterEach(() => {
    authentication.protect.restore();
    validation.validateColumns.restore();
    validation.validateItems.restore();
    validation.validateSheetNames.restore();
    parse.parseItems.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.dataEntry.import);
    });
  });

  describe('#middleware', () => {
    it('only admins are alowed to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['uploader', 'administrator']),
        fileUploadMock,
        flash
      ]);

      sinon.assert.calledWith(authentication.protect, ['uploader', 'administrator']);
    });
  });

  describe('#import', () => {
    const projectFields = [{ id: 1 }];
    const milestoneFields = [{ id: 2, name: 'projectUid' }];

    beforeEach(() => {
      sinon.stub(Project, 'import');
      sinon.stub(Milestone, 'import');
      Project.fieldDefintions = sinon.stub().returns(projectFields);
      Milestone.fieldDefintions = sinon.stub().returns(milestoneFields);
    });

    afterEach(() => {
      Project.import.restore();
      Milestone.import.restore();
    });

    it('correctly imports all projects and milestones', async () => {
      const project = 'project';
      const milestone = 'milestone';
      const transaction = sequelize.transaction();

      await page.import([project], [milestone]);

      sinon.assert.calledWith(Project.import, project, projectFields, { transaction });
      sinon.assert.calledWith(Milestone.import, milestone, milestoneFields, { transaction });
      sinon.assert.called(transaction.commit);
    });

    it('rolls back transaction if anything fails', async () => {
      const project = 'project';
      const milestone = 'milestone';
      const transaction = sequelize.transaction();
      Project.import.throws(new Error('Some error'));

      let error = {};
      try {
        await page.import([project], [milestone]);
      } catch (err) {
        error = err.message;
      }

      expect(error).to.eql('Some error');

      sinon.assert.calledWith(Project.import, project, projectFields, { transaction });
      sinon.assert.called(transaction.rollback);
    });
  });

  describe('#validateItems', () => {
    it('validates each item parsed', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const parsedItems = [{ foo: 'bar' }];
      const fields = [{ importColumnName: 'some name' }];

      validation.validateColumns.returns('validation.validateColumns');
      validation.validateItems.returns('validation.validateItems');

      const response = page.validateItems(items, parsedItems, fields);

      expect(response).to.eql(['validation.validateColumns', 'validation.validateItems']);

      sinon.assert.calledWith(validation.validateColumns, Object.keys(items[0]), [fields[0].importColumnName]);
      sinon.assert.calledWith(validation.validateItems, parsedItems, fields);
    });
  });

  describe('#validateProjects', () => {
    it('rejects if no project found', async () => {
      parse.parseItems.returns([])
      const response = await page.validateProjects();
      expect(response).to.eql({ projectColumnErrors: [{ error: 'No projects found' }] });
    });

    it('returns correct variables', async () => {
      const projectColumnErrors = [{ foo: 'bar' }];
      const projectErrors = [{ baz: 'baz' }];
      const parsedProjects = [{ id: 1 }];
      page.req.user.departments = [];

      page.validateItems = () => [projectColumnErrors, projectErrors];
      parse.parseItems.returns(parsedProjects);

      const response = await page.validateProjects();

      expect(response).to.eql({ projectErrors, projectColumnErrors, parsedProjects });
    });
  });

  describe('#validateMilestones', () => {
    it('rejects if no milestone found', async () => {
      parse.parseItems.returns([]);
      const response = await page.validateMilestones();
      expect(response).to.eql({});
    });

    it('returns correct variables', async () => {
      const milestoneColumnErrors = [{ foo: 'bar' }];
      const milestoneErrors = [{ baz: 'baz' }];
      const parsedMilestones = [{ id: 1 }];

      page.validateItems = () => [milestoneColumnErrors, milestoneErrors];
      parse.parseItems.returns(parsedMilestones);

      const response = await page.validateMilestones();

      expect(response).to.eql({ milestoneErrors, milestoneColumnErrors, parsedMilestones });
    });

    it('uses project priorityTheme as default', async () => {
      const parsedMilestones = [{ id: 1, projectUid: 1 }];
      const parsedProjects = [{ uid: 1, deliveryTheme: 'some theme' }];

      page.validateItems = () => [null, null];
      parse.parseItems.returns(parsedMilestones);

      const response = await page.validateMilestones([], parsedProjects);

      expect(response.parsedMilestones).to.eql([{ id: 1, priorityTheme: 'some theme', projectUid: 1 }]);
    });
  });

  describe('#validateImport', () => {
    it('only returns sheet errors', async () => {
      const data = { id: 1 };
      validation.validateSheetNames.returns({ errors: ['some errors'] });

      const response = await page.validateImport(data);

      expect(response).to.eql({
        errors: { sheetErrors: ['some errors'] },
        importId: data.id
      });
    });

    it('returns errors and parsed projects and milestones', async () => {
      const data = { id: 1 };

      const projectErrors = ['projectErrors'];
      const projectColumnErrors = ['projectColumnErrors'];
      const parsedProjects = ['parsedProjects'];
      const milestoneErrors = ['milestoneErrors'];
      const milestoneColumnErrors = ['milestoneColumnErrors'];
      const parsedMilestones = ['parsedMilestones'];

      page.validateProjects = () => {
        return { projectErrors, projectColumnErrors, parsedProjects }
      };
      page.validateMilestones = () => {
        return { milestoneErrors, milestoneColumnErrors, parsedMilestones };
      };
      validation.validateSheetNames.returns({ errors: [] });

      const response = await page.validateImport(data);

      const errors = { projectErrors, milestoneErrors, projectColumnErrors, milestoneColumnErrors };

      expect(response).to.eql({
        errors,
        projects: parsedProjects,
        milestones: parsedMilestones,
        importId: data.id
      });
    });
  });

  describe('#finaliseImport', () => {
    it('redirects user if no active import', async () => {
      BulkImport.findOne.returns(false);

      await page.finaliseImport();

      sinon.assert.calledWith(page.res.redirect, paths.dataEntry.bulkUploadFile);
    });

    it('redirects if any errors found when validating import', async () => {
      BulkImport.findOne.returns(true);
      page.validateImport = () => {
        return { errors: { someError: [] } };
      };

      await page.finaliseImport();

      sinon.assert.calledWith(page.res.redirect, paths.dataEntry.import);
    });

    it('redirects with flash if import failed', async () => {
      BulkImport.findOne.returns(true);
      page.validateImport = () => {
        return { errors: {} };
      };
      page.import = () => {
        throw new Error('some error');
      };

      await page.finaliseImport();

      sinon.assert.calledWith(page.req.flash, 'Failed to import data');
      sinon.assert.calledWith(page.res.redirect, paths.dataEntry.import);
    });

    it('redirects to submission success on good import', async () => {
      BulkImport.findOne.returns(true);
      page.validateImport = () => {
        return { errors: {} };
      };
      page.import = () => {};
      page.removeTemporaryBulkImport = () => {};

      await page.finaliseImport();

      sinon.assert.calledWith(page.res.redirect, paths.dataEntry.submissionSuccess);
    });
  });

  describe('#removeTemporaryBulkImport', () => {
    it('removes bulk upload record in db', async () => {
      await page.removeTemporaryBulkImport(1);
      sinon.assert.calledWith(BulkImport.destroy, {
        where: {
          userId: page.req.user.id,
          id: 1
        }
      });
    });
  });

  describe('#cancelImport', () => {
    it('calles #removeTemporaryBulkImport and redirects to upload page', async () => {
      page.removeTemporaryBulkImport = sinon.stub();

      await page.cancelImport();

      sinon.assert.called(page.removeTemporaryBulkImport);
      sinon.assert.calledWith(page.res.redirect, paths.dataEntry.bulkUploadFile);
    });
  });

  describe('#postRequest', () => {
    it('cancels the import if the user requests', async () => {
      sinon.stub(page, 'cancelImport').resolves();
      page.req.body = { cancel: 'cancel', importId: '123' };
      await page.postRequest(req, res);
      sinon.assert.called(page.cancelImport);
    });

    it('imports the file to the system', async () => {
      sinon.stub(page, 'finaliseImport').resolves();
      page.req.body = { import: 'import', importId: '123' };
      await page.postRequest(req, res);
      sinon.assert.called(page.finaliseImport);
    });
  });

  describe('#getRequest', () => {
    it('redirects to upload page if no record found', async () => {
      BulkImport.findOne.returns(false);

      await page.getRequest(req, res);

      sinon.assert.calledWith(page.res.redirect, paths.dataEntry.bulkUploadFile);
    });

    it('validates upload and renders page', async () => {
      BulkImport.findOne.returns(true);

      const errors = 'errors';
      const projects = 'projects';
      const milestones = 'milestones';
      const importId = 'importId';
      page.validateImport = () => {
        return { errors, projects, milestones, importId };
      };
      page.locals = {};

      await page.getRequest(req, res);

      sinon.assert.called(res.render);
    });
  });
});
