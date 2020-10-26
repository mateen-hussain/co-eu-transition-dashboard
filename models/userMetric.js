const { Model, STRING, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');

class UserMetric extends Model {}
UserMetric.init({
  userId: {
    type: INTEGER,
    primaryKey: true,
    field: 'user_id'
  },
  metricId: {
    type: STRING(50),
    primaryKey: true,
    field: 'metric_id'
  }
}, { sequelize, modelName: 'userMetric', tableName: 'user_metric', timestamps: false });

module.exports = UserMetric;
