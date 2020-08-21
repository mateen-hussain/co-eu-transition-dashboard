const { expect, sinon } = require('test/unit/util/chai');
const Category = require('models/category');
const CategoryField = require('models/categoryField');
const CategoryParent = require('models/categoryParent')
const Entity = require('models/entity');
const { STRING, INTEGER } = require('sequelize');

describe('models/category', () => {
  it('called Category.init with the correct parameters', () => {
    expect(Category.init).to.have.been.calledWith({
      id: {
        type: INTEGER,
        primaryKey: true
      },
      name: STRING(45),
      publicIdFormat: {
        type: STRING(50),
        field: "public_id_format"
      }
    });
  });

  it('called Category.hasMany with the correct parameters', () => {
    expect(Category.hasMany).to.have.been.calledWith(CategoryField, { foreignKey: 'categoryId' });
    expect(Category.hasMany).to.have.been.calledWith(Entity, { foreignKey: 'categoryId' });
  });

  it('called Category.belongsToMany with the correct parameters', () => {
    expect(Category.belongsToMany).to.have.been.calledWith(Category, { through: CategoryParent, foreignKey: 'categoryId', as: 'parents', otherKey: 'parentCategoryId' });
  });

  it('called CategoryField.belongsTo with the correct parameters', () => {
    expect(CategoryField.belongsTo).to.have.been.calledWith(Category, { foreignKey: 'categoryId' });
  });

  it('called Entity.belongsTo with the correct parameters', () => {
    expect(CategoryField.belongsTo).to.have.been.calledWith(Category, { foreignKey: 'categoryId' });
  });

  describe('#fieldDefinitions', () => {
    beforeEach(() => {
      Category.findOne.returns({
        id: 1,
        parents: []
      });

      CategoryField.findAll.returns([{
        name: 'field1',
        type: 'string',
        displayName: 'Field 1',
        isActive: true
      }]);
    });

    it('gets fields assosaited with category', async () => {
      const categoryName = 'theme';

      const definitions = await Category.fieldDefinitions(categoryName);

      expect(definitions).to.eql([
        {
          name: 'publicId',
          type: 'string',
          isUnique: true,
          description: 'A unqiue ID to each item',
          displayName: 'Public ID',
          isActive: true
        },{
          name: 'field1',
          type: 'string',
          displayName: 'Field 1',
          isActive: true
        }
      ]);

      sinon.assert.calledWith(Category.findOne, {
        where: { name: categoryName },
        include: {
          model: Category,
          as: 'parents'
        }
      });

      sinon.assert.calledWith(CategoryField.findAll, {
        include: {
          attributes: [],
          model: Category,
          where: { name: categoryName },
          required: true
        },
        where: { isActive: true },
        order: [["priority", "ASC"]],
        raw: true
      });
    });

    it('throws an error if no category found', async () => {
      Category.findOne.returns();

      let message = '';
      try{
        await Category.fieldDefinitions();
      } catch (thrownError) {
        message = thrownError.message;
      }
      expect(message).to.eql('Unkown category');
    });

    it('adds required parent public id with group if category has parent', async () => {
      const categoryName = 'statement';

      Category.findOne.returns({
        id: 2,
        parents: [{
          id: 1
        }]
      });

      Entity.findAll.returns([{
        publicId: 'public id 1'
      }, {
        publicId: 'public id 2'
      }]);

      const definitions = await Category.fieldDefinitions(categoryName);

      expect(definitions).to.eql([
        {
          name: 'publicId',
          type: 'string',
          isUnique: true,
          description: 'A unqiue ID to each item',
          displayName: 'Public ID',
          isActive: true
        }, {
          name: 'parentPublicId',
          type: 'group',
          description: 'The parent Public ID this item is directly related to',
          displayName: 'Parent Public ID',
          isRequired: true,
          isActive: true,
          config: { options: ['public id 1', 'public id 2'] }
        }, {
          name: 'field1',
          type: 'string',
          displayName: 'Field 1',
          isActive: true
        }
      ]);

      sinon.assert.calledWith(Entity.findAll, {
        attributes: ['publicId'],
        include: {
          attributes: [],
          model: Category,
          required: true,
          where: { id: [1] }
        }
      });
    });
  });
});
