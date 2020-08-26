const { Model, INTEGER, TEXT, DATE, NOW } = require('sequelize');
const sequelize = require('services/sequelize');

class EntityFieldEntryAudit extends Model {}

EntityFieldEntryAudit.init({
  entityId: {
    type: INTEGER,
    field: 'entity_id'
  },
  categoryFieldId: {
    type: INTEGER,
    field: 'category_field_id'
  },
  value: {
    type: TEXT
  },
  archivedAt: {
    type: DATE,
    field: 'archived_at',
    defaultValue: NOW
  },
  createdAt: {
    field: "created_at",
    type: DATE
  }
}, { sequelize, modelName: 'entityFieldEntryAudit', tableName: 'entity_field_entry_audit', createdAt: 'created_at', updatedAt: 'updated_at' });
EntityFieldEntryAudit.removeAttribute('id');

module.exports = EntityFieldEntryAudit;
