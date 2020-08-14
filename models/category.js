const { Model, STRING, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');
const CategoryParent = require('./categoryParent');
const CategoryField = require('./categoryField');
const Entity = require('./entity');

class Category extends Model {
  static async fieldDefintions(categoryName) {
    const category = await Category.findOne({
      where: { name: categoryName },
      include: {
        model: Category,
        as: 'parents'
      }
    });

    if(!category) {
      throw new Error('Unkown category');
    }

    const fields = [{
      name: 'publicId',
      type: 'string',
      isUnique: true,
      displayName: 'Public ID',
      description: 'A unqiue ID to each item',
      isActive: true
    }];

    if(category.parents.length) {
      const parentEntities = await Entity.findAll({
        attributes: ['publicId'],
        include: {
          attributes: [],
          model: Category,
          required: true,
          where: { id: category.parents.map(parent => parent.id ) }
        }
      });

      fields.push({
        name: 'parentPublicId',
        type: 'group',
        displayName: 'Parent Public ID',
        description: 'The parent Public ID this item is directly related to',
        isActive: true,
        config: { options: parentEntities.map(parentEntity => parentEntity.publicId) }
      });
    }

    const categoryFields = await CategoryField.findAll({
      include: {
        attributes: [],
        model: Category,
        where: { name: categoryName },
        required: true
      },
      where: { isActive: true },
      raw: true
    });

    return [...fields, ...categoryFields];
  }
}

Category.init({
  id: {
    type: INTEGER,
    primaryKey: true
  },
  name: STRING(45),
  publicIdFormat: {
    type: STRING(50),
    field: "public_id_format"
  }
}, { sequelize, modelName: 'category', tableName: 'category', timestamps: false });

Category.hasMany(CategoryField, { foreignKey: 'categoryId' });
Category.hasMany(Entity, { foreignKey: 'categoryId' });

Category.belongsToMany(Category, { through: CategoryParent, foreignKey: 'categoryId', as: 'parents', otherKey: 'parentCategoryId' });

CategoryField.belongsTo(Category, { foreignKey: 'categoryId' });

Entity.belongsTo(Category, { foreignKey: 'categoryId' });

module.exports = Category;
