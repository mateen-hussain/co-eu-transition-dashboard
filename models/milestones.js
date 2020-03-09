const { STRING, DATE, Model } = require('sequelize');
const sequelize = require('services/sequelize');

class Milestone extends Model {}
Milestone.init({
  milestone_uid: {
    type: STRING,
    allowNull: false
  },
  description: {
    type: STRING,
    allowNull: false
  },
  due_date: {
    type: DATE,
    allowNull: false
  },
  last_comment: {
    type: STRING
  }
}, { sequelize, modelName: 'milestone' });

module.exports = Milestone;