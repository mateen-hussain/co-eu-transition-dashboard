const { STRING, DATE, Model } = require('sequelize');
const sequelize = require('services/sequelize');
const modelUtils = require('helpers/models');
const MilestoneFieldEntry = require('./milestoneFieldEntry');
const MilestoneField = require('./milestoneField');
const moment = require('moment');
const pick = require('lodash/pick');

class Milestone extends Model {
  static includes(attributeKey) {
    return Object.keys(this.rawAttributes).includes(attributeKey);
  }

  static createSearch(attributeKey, options) {
    return modelUtils.createFilterOptions(attributeKey, options);
  }

  static async fieldDefintions() {
    const milestoneFields = await MilestoneField.findAll({
      where: { is_active: true }
    });

    milestoneFields.push(...[{
      name: 'uid',
      type: 'string',
      isRequired: true,
      isUnique: true,
      importColumnName: 'Milestone UID'
    },{
      name: 'projectUid',
      type: 'string',
      isRequired: true,
      importColumnName: 'Project UID'
    },{
      name: 'description',
      type: 'string',
      importColumnName: 'Milestone description'
    },{
      name: 'date',
      type: 'date',
      importColumnName: 'Target date for delivery'
    }]);

    return milestoneFields;
  }

  static async import(milestone, milestoneFields, options) {
    const attributes = Object.keys(milestone);

    const milestoneAttributes = attributes.filter(attribute => this.rawAttributes[attribute]);
    const milestoneToUpsert = pick(milestone, milestoneAttributes);

    await this.upsert(milestoneToUpsert, options);

    await this.importMilestoneFieldEntries(milestone, milestoneFields, options);
  }

  static async importMilestoneFieldEntries(milestone, milestoneFields, options) {
    const attributes = Object.keys(milestone);

    const milestoneFieldEntryAttributes = attributes.filter(attribute => !this.rawAttributes[attribute]);
    const milestoneFieldEntries = milestoneFieldEntryAttributes.map(milestoneFieldEntryAttribute => {
      const milestoneField = milestoneFields.find(milestoneField => milestoneField.name === milestoneFieldEntryAttribute)
      return {
        milestoneUid: milestone.uid,
        fieldId: milestoneField.id,
        value: milestone[milestoneField.name]
      };
    });

    for (const milestoneFieldEntry of milestoneFieldEntries) {
      await MilestoneFieldEntry.import(milestoneFieldEntry, options);
    }
  }

  get fields() {
    const fields = modelUtils.transformForView(this);

    if(this.get('milestoneFieldEntries')){
      this.get('milestoneFieldEntries').forEach(field => {
        field.fields.forEach((value, key) => fields.set(key, value));
      });
    }

    return fields;
  }
}

Milestone.init({
  uid: {
    type: STRING(32),
    primaryKey: true,
    displayName: 'Milestone UID'
  },
  projectUid: {
    type: STRING(32),
    field: "project_uid"
  },
  description: {
    type: STRING,
    allowNull: false,
    displayName: 'Milestone Description'
  },
  date: {
    type: DATE,
    allowNull: true,
    displayName: 'Due Date',
    get() {
      if (!this.getDataValue('date')) return;
      return moment(this.getDataValue('date'), 'YYYY-MM-DD').format('DD/MM/YYYY');
    }
  }
}, { sequelize, modelName: 'milestone', tableName: 'milestone', createdAt: 'created_at', updatedAt: 'updated_at' });

Milestone.hasMany(MilestoneFieldEntry, { foreignKey: 'milestoneUid' });
Milestone.hasMany(MilestoneFieldEntry, { foreignKey: 'milestoneUid', as: 'MilestoneFieldEntryFilter' });

module.exports = Milestone;
