const { Model, INTEGER, DATE, JSON } = require('sequelize');
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
  createdAt: {
    type: DATE,
    field: 'created_at'
  }
}, { sequelize, modelName: 'bulkImport', tableName: 'bulk_import', timestamps: false });

module.exports = BulkImport;
