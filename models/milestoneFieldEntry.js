const { Model, STRING, INTEGER, TEXT, Op } = require('sequelize');
const sequelize = require('services/sequelize');
const modelUtils = require('helpers/models');
const MilestoneField = require('./milestoneField');
const MilestoneFieldEntryAudit = require('./milestoneFieldEntryAudit');

class MilestoneFieldEntry extends Model {
  static async import(milestoneFieldEntry, options) {
    if (milestoneFieldEntry.value === undefined) {
      return
    }

    const existingField = await MilestoneFieldEntry.findOne({
      where: {
        milestoneUid: milestoneFieldEntry.milestoneUid,
        fieldId: milestoneFieldEntry.fieldId
      }
    });

    if (existingField && String(existingField.value) === String(milestoneFieldEntry.value)) {
      return;
    }

    if (existingField) {
      await MilestoneFieldEntryAudit.create(existingField.toJSON(), options);
    }

    await this.upsert(milestoneFieldEntry, options);
  }

  get fields() {
    const milestoneField = this.get('milestoneField');
    return new Map().set(milestoneField.name, {
      id: milestoneField.name,
      name: milestoneField.displayName,
      value: this.get('value'),
      type: milestoneField.type
    });
  }

  static createSearch(milestoneField, options) {
    const filters = options.map(option => {
      return {
        [Op.and]: {
          milestone_field_id: milestoneField.id,
          value: option
        }
      }
    });

    return { [Op.or]: filters };
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
      if (this.get('milestoneField')) {
        return modelUtils.parseFieldEntryValue(value, this.get('milestoneField').get('type'));
      } else {
        return value;
      }
    }
  }
}, { sequelize, modelName: 'milestoneFieldEntry', tableName: 'milestone_field_entry', createdAt: 'created_at', updatedAt: 'updated_at' });

MilestoneFieldEntry.belongsTo(MilestoneField, { foreignKey: 'fieldId' });

module.exports = MilestoneFieldEntry;
