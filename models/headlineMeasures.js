const { STRING, Model, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');

class HeadlineMeasures extends Model {}
HeadlineMeasures.init({
  entityPublicId: {
    type: STRING(64),
    allowNull: true,
    field: "enttiy_public_id"
  },
  priority: {
    type: INTEGER,
    allowNull: true,
    field: "priority"
  },
}, { sequelize, modelName: 'HeadlineMeasures', tableName: 'headline_measures', timestamps: false });
HeadlineMeasures.removeAttribute('id');

module.exports = HeadlineMeasures;