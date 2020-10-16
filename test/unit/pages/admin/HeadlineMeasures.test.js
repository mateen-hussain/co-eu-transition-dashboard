const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const flash = require('middleware/flash');
const Category = require('models/category');
const CategoryField = require('models/categoryField');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const HeadlineMeasuresModel = require('models/headlineMeasures');
const sequelize = require('services/sequelize');

let page = {};

describe('pages/admin/headline-measures/headlineMeasures', () => {
  beforeEach(() => {
    const HeadlineMeasures = require('pages/admin/headline-measures/HeadlineMeasures');

    const res = { cookies: sinon.stub() };

    const req = { cookies: [], flash: sinon.stub() };

    page = new HeadlineMeasures('some path', req, res);

    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    authentication.protect.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.admin.headlineMeasures);
    });
  });

  describe('#middleware', () => {
    it('only admins are aloud to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['admin']),
        flash
      ]);

      sinon.assert.calledWith(authentication.protect, ['admin']);
    });
  });

  describe('#saveData', () => {
    const measures = 'some data';
    const transaction = sequelize.transaction();

    beforeEach(() => {
      HeadlineMeasuresModel.bulkCreate.reset();
      transaction.commit.reset();
      transaction.rollback.reset();
    });

    afterEach(() => {
      HeadlineMeasuresModel.destroy.resolves();
    });

    it('saves data successfully', async () => {

      await page.saveData(measures);

      sinon.assert.calledWith(HeadlineMeasuresModel.destroy, {
        where: {},
        truncate: true
      }, { transaction });

      sinon.assert.calledWith(HeadlineMeasuresModel.bulkCreate, measures, { transaction });
      sinon.assert.called(transaction.commit);

    });

    it('throws error if error when destroying or creating', async () => {
      const transaction = sequelize.transaction();

      HeadlineMeasuresModel.destroy.throws('Some error');

      await page.saveData(measures);

      sinon.assert.calledWith(HeadlineMeasuresModel.destroy, {
        where: {},
        truncate: true
      }, { transaction });

      sinon.assert.called(transaction.rollback);
      sinon.assert.calledWith(page.req.flash, 'Error saving headline measures');

      sinon.assert.notCalled(HeadlineMeasuresModel.bulkCreate);
      sinon.assert.notCalled(transaction.commit);
    });
  });

  describe('#isValid', () => {
    it("rejects if headline measures not defined", () => {
      const response = page.isValid({});
      expect(response).to.not.be.ok;
      sinon.assert.calledWith(page.req.flash, 'Ensure at least one headline measure has been submitted.');
    });

    it("rejects if headline measures has duplicate public ids", () => {
      const response = page.isValid({
        headlineMeasures: [{
          entityPublicId: 1
        }, {
          entityPublicId: 1
        }]
      });
      expect(response).to.not.be.ok;
      sinon.assert.calledWith(page.req.flash, 'There are duplicate measures selected');
    });

    it('passes if validating is all good', () => {
      const response = page.isValid({
        headlineMeasures: [{
          entityPublicId: 1
        }, {
          entityPublicId: 2
        }]
      });
      expect(response).to.be.ok;
      sinon.assert.notCalled(page.req.flash);
    });
  });

  describe('#getCategory', () => {
    it('gets and returns category', async () => {
      const category = { name: 'some-name' };
      Category.findOne.resolves(category);

      const response = await page.getCategory('some-name');

      expect(response).to.eql(category);
    });

    it('gets and returns category', async () => {
      Category.findOne.resolves();

      let error = {};
      try {
        await page.getCategory('some-name');
      } catch (err) {
        error = err.message;
      }

      expect(error).to.eql('Category export, error finding some-name category');
    });
  });

  describe('#getMeasures', () => {
    const category = { id: 1 };

    beforeEach(() => {
      sinon.stub(page, 'getCategory').returns(category);
    });

    it('gets measures and maps into items for select in html', async () => {
      const measures = [{
        publicId: 1,
        entityFieldEntries: [{
          categoryField: {
            name: 'groupDescription'
          },
          value: 'measure name'
        },{
          categoryField: {
            name: 'filter'
          },
          value: 'RAYG'
        }], parents: [{
          parents: [{
            categoryId: 1,
            entityFieldEntries: [{
              categoryField: { name: 'name' },
              value: 'theme name'
            }]
          }]
        }]
      }];

      Entity.findAll.returns(measures);

      const measuresMapped = await page.getMeasures();

      sinon.assert.calledWith(page.getCategory, 'measure');
      sinon.assert.calledWith(page.getCategory, 'Theme');

      sinon.assert.calledWith(Entity.findAll, {
        where: {
          categoryId: category.id
        },
        include: [{
          model: EntityFieldEntry,
          include: {
            attributes: ['name'],
            model: CategoryField,
            where: { isActive: true },
            required: true
          }
        }, {
          model: Entity,
          as: 'parents',
          include: [{
            model: Entity,
            as: 'parents',
            include: [{
              separate: true,
              model: EntityFieldEntry,
              include: CategoryField
            }]
          }]
        }]
      });

      expect(measuresMapped).to.eql([
        {
          "text": "-- Select --"
        },
        {
          "text": "theme name - measure name",
          "value": 1
        }
      ]);

    });
  });

  describe('#getHeadlineMeasures', () => {
    it('gets all headline measures', async () => {
      const headlineMeasures = [{
        entityPublicId: 1,
        priority: 1
      }, {
        entityPublicId: 2,
        priority: 2
      }];

      HeadlineMeasuresModel.findAll.returns(headlineMeasures);

      const currentHeadlineMeasures = await page.getHeadlineMeasures();

      for(let i = 1; i <= 20; i ++) {
        if(!headlineMeasures[i])
          headlineMeasures.push({});
      }

      expect(currentHeadlineMeasures).to.eql(headlineMeasures);
    });

    it('does not return empty objects if 10 measures are returned', async () => {
      const headlineMeasures = []

      for(let i = 1; i <= 20; i ++) {
        headlineMeasures.push({
          entityPublicId: i,
          priority: i
        });
      }

      HeadlineMeasuresModel.findAll.returns(headlineMeasures);

      const currentHeadlineMeasures = await page.getHeadlineMeasures();

      expect(currentHeadlineMeasures).to.eql(headlineMeasures);
    });
  });

  describe('setSelected', () => {
    const measures = [{
      value: 'public-id-1'
    },{
      value: 'public-id-2'
    }];

    it('selects measure if matches publicId', () => {
      const measuresWithOneSelected = page.setSelected(measures, 'public-id-1');
      expect(measuresWithOneSelected).to.eql([
        {
          value: 'public-id-1',
          selected: true
        },{
          value: 'public-id-2',
          selected: false
        }
      ]);
    });

    it('does not select measure if no matches with publicId', () => {
      const measuresWithOneSelected = page.setSelected(measures, 'no match');
      expect(measuresWithOneSelected).to.eql([
        {
          value: 'public-id-1',
          selected: false
        },{
          value: 'public-id-2',
          selected: false
        }
      ]);
    });
  });
});
