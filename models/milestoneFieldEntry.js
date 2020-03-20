const { Model, STRING, INTEGER, BLOB } = require('sequelize');
const sequelize = require('services/sequelize');
const modelUtils = require('helpers/models');
const MilestoneField = require('./milestoneField');

class MilestoneFieldEntry extends Model {
  get fields() {
    const milestoneField = this.get('milestoneField');
    return {
      id: milestoneField.name,
      name: milestoneField.displayName,
      value: this.get('value'),
      type: milestoneField.type
    };
  }
}

MilestoneFieldEntry.init({
  field_id: {
    type: INTEGER,
    primaryKey: true,
    field: 'milestone_field_id'
  },
  uid: {
    type: STRING(45),
    primaryKey: true,
    field: 'milestone_uid'
  },
  value: {
    type: BLOB,
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

MilestoneFieldEntry.belongsTo(MilestoneField, { foreignKey: 'field_id' });

module.exports = MilestoneFieldEntry;