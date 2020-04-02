const { Model, STRING, INTEGER, TEXT } = require('sequelize');
const sequelize = require('services/sequelize');
const modelUtils = require('helpers/models');
const MilestoneField = require('./milestoneField');

class MilestoneFieldEntry extends Model {
  get fields() {
    const milestoneField = this.get('milestoneField');
    return new Map().set(milestoneField.name, {
      id: milestoneField.name,
      name: milestoneField.displayName,
      value: this.get('value'),
      type: milestoneField.type
    });
  }
}

MilestoneFieldEntry.init({
  fieldId: {
    type: INTEGER,
    primaryKey: true,
    field: 'milestone_field_id'
  },
  milestoneUid: {
    type: STRING(45),
    primaryKey: true,
    field: 'milestone_uid'
  },
  value: {
    type: TEXT,
    get() {
      if (!this.getDataValue('value')) return;
      const value = this.getDataValue('value').toString('utf8');
      return modelUtils.parseFieldEntryValue(value, this.get('milestoneField').get('type'))
    },
    set(value) {
      if (!this.milestoneField) {
        return this.setDataValue('value', value)
      }

      return this.setDataValue('value', value);
    },
    validate: {
      isValid(val) {
        return modelUtils.validateFieldEntryValue.call(this, val);
      }
    }
  }
}, { sequelize, modelName: 'milestoneFieldEntry', tableName: 'milestone_field_entry', createdAt: 'created_at', updatedAt: 'updated_at' });

MilestoneFieldEntry.belongsTo(MilestoneField, { foreignKey: 'fieldId' });

module.exports = MilestoneFieldEntry;
