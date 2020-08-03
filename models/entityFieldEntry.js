const { Model, INTEGER, TEXT } = require('sequelize');
const sequelize = require('services/sequelize');
const EntityFieldEntryAudit = require('./entityFieldEntryAudit');

class EntityFieldEntry extends Model {
  static async import(entityFieldEntry, options) {
    if (entityFieldEntry.value === undefined) {
      return;
    }

    await this.createAuditTrail(entityFieldEntry, options);

    await this.upsert(entityFieldEntry, options);
  }

  static async createAuditTrail(entityFieldEntry, options) {
    const existingField = await EntityFieldEntry.findOne({
      where: {
        entityId: entityFieldEntry.entityId,
        categoryFieldId: entityFieldEntry.categoryFieldId
      }
    });

    if (existingField && String(existingField.value) === String(entityFieldEntry.value)) {
      return;
    }

    if (existingField) {
      await EntityFieldEntryAudit.create(existingField.toJSON(), options);
    }
  }
}

EntityFieldEntry.init({
  entityId: {
    type: INTEGER,
    primaryKey: true,
    field: 'entity_id'
  },
  categoryFieldId: {
    type: INTEGER,
    primaryKey: true,
    field: "category_field_id"
  },
  value: {
    type: TEXT
  }
}, { sequelize, modelName: 'entityFieldEntry', tableName: 'entity_field_entry', createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = EntityFieldEntry;
