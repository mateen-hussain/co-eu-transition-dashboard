const { Model, STRING, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');
const CategoryParent = require('./categoryParent');
const CategoryField = require('./categoryField');
const Entity = require('./entity');

class Category extends Model {
  static parentPublicIdString(category) {
    return `parent${category.name}PublicId`;
  }

  static async fieldDefinitions(categoryName, activeFieldsOnly = true) {
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
      for ( const parent of category.parents) {
        const parentEntities = await Entity.findAll({
          attributes: ['publicId'],
          include: {
            attributes: [],
            model: Category,
            required: true,
            where: { id: parent.id }
          }
        });

        fields.push({
          name: this.parentPublicIdString(parent),
          type: 'group',
          displayName: `Parent ${parent.name} Public ID`,
          description: `The parent ${parent.name} Public ID this item is directly related to`,
          isActive: true,
          isRequired: parent.categoryParent.isRequired,
          config: { options: parentEntities.map(parentEntity => parentEntity.publicId) },
          isParentField: true
        });
      }
    }

    const where = {};

    if(activeFieldsOnly) {
      where['isActive'] = true;
    }

    const categoryFields = await CategoryField.findAll({
      include: {
        attributes: [],
        model: Category,
        where: { name: categoryName },
        required: true
      },
      where,
      raw: true,
      order: [['priority', 'ASC']]
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
  },
  currentMaxId: {
    type: INTEGER,
    field: "current_max_id",
    defaultValue: 0
  }
}, { sequelize, modelName: 'category', tableName: 'category', timestamps: false });

Category.hasMany(CategoryField, { foreignKey: 'categoryId' });
Category.hasMany(Entity, { foreignKey: 'categoryId' });

Category.belongsToMany(Category, { through: CategoryParent, foreignKey: 'categoryId', as: 'parents', otherKey: 'parentCategoryId' });

CategoryField.belongsTo(Category, { foreignKey: 'categoryId' });

Entity.belongsTo(Category, { foreignKey: 'categoryId' });

module.exports = Category;
