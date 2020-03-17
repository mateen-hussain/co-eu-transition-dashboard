const { STRING, DATE, Model } = require('sequelize');
const sequelize = require('services/sequelize');
const modelUtils = require('helpers/models');
const MilestoneFieldEntry = require('./milestoneFieldEntry');

class Milestone extends Model {
  static includes(attributeKey) {
    return Object.keys(this.rawAttributes).includes(attributeKey);
  }

  static createSearch(attributeKey, options) {
    return modelUtils.createFilterOptions(attributeKey, options);
  }

  get fields() {
    return modelUtils.transformForView(this);
  }
}

Milestone.init({
  uid: {
    type: STRING(32),
    primaryKey: true,
    displayName: 'Milestone UID'
  },
  project_uid: {
    type: STRING(32)
  },
  description: {
    type: STRING,
    allowNull: false,
    displayName: 'Milestone Description'
  },
  date: {
    type: DATE,
    allowNull: false,
    displayName: 'Due Date'
  },
  comment: {
    type: STRING,
    allowNull: false,
    displayName: 'Latest comment'
  }
}, { sequelize, modelName: 'milestone', tableName: 'milestone', createdAt: 'created_at', updatedAt: 'updated_at' });

Milestone.hasMany(MilestoneFieldEntry, { foreignKey: 'milestone_uid' });

module.exports = Milestone;