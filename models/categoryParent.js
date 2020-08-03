const { Model, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');

class CategoryParent extends Model {}
CategoryParent.init({
  categoryId: {
    type: INTEGER,
    field: "category_id"
  },
  parentCategoryId: {
    type: INTEGER,
    field: "parent_category_id"
  }
}, { sequelize, modelName: 'categoryParent', tableName: 'category_parent', timestamps: false });

module.exports = CategoryParent;
