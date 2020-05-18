const { STRING, DATE, Model } = require('sequelize');
const sequelize = require('services/sequelize');
const modelUtils = require('helpers/models');
const MilestoneFieldEntry = require('./milestoneFieldEntry');
const MilestoneField = require('./milestoneField');
const moment = require('moment');
const pick = require('lodash/pick');
const logger = require('services/logger');
const sprintf = require('sprintf-js').sprintf;

class Milestone extends Model {
  static includes(attributeKey) {
    return Object.keys(this.rawAttributes).includes(attributeKey);
  }

  static createSearch(attributeKey, options) {
    return modelUtils.createFilterOptions(attributeKey, options);
  }

  static async fieldDefintions() {
    const config = {
      exportOptions: {
        header: {
          fill: "B7E1CE"
        },
        description: {
          fill: "CEEBDF"
        }
      }
    };
    const milestoneFields = [{
      name: 'projectUid',
      type: 'string',
      isRequired: true,
      importColumnName: 'Project UID',
      config,
      description: 'The UID of the project these milestones cover'
    },{
      name: 'uid',
      type: 'string',
      isUnique: true,
      importColumnName: 'Milestone UID',
      config,
      description: 'Please leave this column blank. CO will assign a permanent UID for each milestone.'
    },{
      name: 'description',
      type: 'string',
      importColumnName: 'Milestone description',
      displayName: 'Description',
      isRequired: true,
      config,
      description: 'Name and short description of the milestone, covering what it is, who owns it, what form it takes and why it is required.'
    },{
      name: 'date',
      type: 'date',
      importColumnName: 'Target date for delivery',
      displayName: 'Target date for delivery',
      config: {
        exportOptions: {
          header: { fill: "6C9EE9" },
          description: { fill: "A4C2F2" }
        }
      },
      description: 'When is the date you are currently aiming to deliver this milestone?',
      isRequired: true
    }];

    const fields = await MilestoneField.findAll({
      where: { is_active: true },
      order: ['order']
    });

    milestoneFields.push(...fields);

    return milestoneFields;
  }

  static async import(milestone, milestoneFields, options) {
    const attributes = Object.keys(milestone);

    const milestoneAttributes = attributes.filter(attribute => this.rawAttributes[attribute]);
    const milestoneToUpsert = pick(milestone, milestoneAttributes);

    if (!milestoneToUpsert.uid) {
      try {
        milestoneToUpsert.uid = await Milestone.getNextIDIncrement(milestoneToUpsert.projectUid, options);
        milestone.uid = milestoneToUpsert.uid;
      } catch (error) {
        logger.error('Unable to generate next milestone uid');
        throw error;
      }
    }

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

  static async getNextIDIncrement(projectUid, { transaction } = {}) {
    const options = { transaction };
    if (transaction) {
      options.lock = transaction.LOCK
    }

    const milestone = await Milestone.findOne({
      where: { projectUid },
      order: [['uid', 'DESC']]
    }, options);

    if(!milestone) {
      return `${projectUid}-01`;
    }

    const current = parseInt(milestone.uid.split('-')[2]);
    return sprintf("%s-%02d", projectUid, current+1);
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
  },
  updatedAt: {
    type: DATE,
    field: "updated_at",
    get() {
      return moment(this.getDataValue('updatedAt'), 'YYYY-MM-DD').format('DD/MM/YYYY');
    }
  }
}, { sequelize, modelName: 'milestone', tableName: 'milestone', createdAt: 'created_at', updatedAt: 'updated_at' });

Milestone.hasMany(MilestoneFieldEntry, { foreignKey: 'milestoneUid' });
Milestone.hasMany(MilestoneFieldEntry, { foreignKey: 'milestoneUid', as: 'MilestoneFieldEntryFilter' });
MilestoneFieldEntry.belongsTo(Milestone, { foreignKey: 'milestoneUid' });


module.exports = Milestone;
