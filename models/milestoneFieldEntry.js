const { Model, STRING, INTEGER, BLOB } = require('sequelize');
const sequelize = require('services/sequelize');
const modelUtils = require('helpers/models');
const MilestoneField = require('./milestoneField');

class MilestoneFieldEntry extends Model {
  get fields() {
    const milestoneField = this.get('milestoneField');
    return {
      id: `milestoneFieldEntry->${milestoneField.id}`,
      name: milestoneField.name,
      value: this.get('value')
    };
  }
}

MilestoneFieldEntry.init({
  milestone_field_id: {
    type: INTEGER,
    primaryKey: true
  },
  milestone_uid: {
    type: STRING(45),
  },
  value: {
    type: BLOB,
    get() {
      let value = this.getDataValue('value').toString('utf8');
      return modelUtils.parseFieldEntryValue(value, this.milestoneField.get('type'))
    }
  }
}, { sequelize, modelName: 'milestoneFieldEntry', tableName: 'milestone_field_entry', createdAt: 'created_at', updatedAt: 'updated_at' });

MilestoneFieldEntry.belongsTo(MilestoneField, { foreignKey: 'milestone_field_id' });

module.exports = MilestoneFieldEntry;