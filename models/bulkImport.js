const { Model, INTEGER, JSON, STRING } = require('sequelize');
const sequelize = require('services/sequelize');

class BulkImport extends Model {}

BulkImport.init({
  id: {
    type: INTEGER,
    field: 'id',
    primaryKey: true
  },
  userId: {
    type: INTEGER,
    field: 'user_id'
  },
  data: {
    type: JSON
  },
  category: {
    type: STRING(64)
  }
}, { sequelize, modelName: 'bulkImport', tableName: 'bulk_import', createdAt: 'created_at', updatedAt: false });

module.exports = BulkImport;
