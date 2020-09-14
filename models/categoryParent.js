const { Model, INTEGER, BOOLEAN } = require('sequelize');
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
  },
  isRequired: {
    type: BOOLEAN,
    field: "is_required"
  }
}, { sequelize, modelName: 'categoryParent', tableName: 'category_parent', timestamps: false });

module.exports = CategoryParent;
