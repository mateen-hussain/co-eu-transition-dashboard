const { Model, INTEGER, JSON } = require('sequelize');
const sequelize = require('services/sequelize');

class TemporaryBuilImportStore extends Model {}

TemporaryBuilImportStore.init({
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
  }
}, { sequelize, modelName: 'temporaryBuilImportStore', tableName: 'temporary_bulk_import_store', createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = TemporaryBuilImportStore;
