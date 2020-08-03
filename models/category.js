const { Model, STRING, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');
const CategoryParent = require('./categoryParent');
const CategoryField = require('./categoryField');
const Entity = require('./entity');

class Category extends Model {}

Category.init({
  id: {
    type: INTEGER,
    primaryKey: true
  },
  name: STRING(45)
}, { sequelize, modelName: 'category', tableName: 'category', timestamps: false });

Category.hasMany(CategoryField, { foreignKey: 'categoryId' });
Category.hasMany(Entity, { foreignKey: 'categoryId' });

Category.belongsToMany(Category, { through: CategoryParent, foreignKey: 'categoryId', as: 'parents', otherKey: 'parentCategoryId' });

CategoryField.belongsTo(Category, { foreignKey: 'categoryId' });

Entity.belongsTo(Category, { foreignKey: 'categoryId' });

module.exports = Category;
