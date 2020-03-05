const { STRING, DATE, Model } = require('sequelize');
const sequelize = require('services/sequelize');

class Milestone extends Model {}
Milestone.init({
  milestone_uid: STRING,
  description: STRING,
  due_date: DATE,
  last_comment: STRING
}, { sequelize, modelName: 'milestone' });

module.exports = Milestone;