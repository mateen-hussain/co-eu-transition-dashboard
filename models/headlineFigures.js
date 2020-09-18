const { STRING, Model } = require('sequelize');
const sequelize = require('services/sequelize');

class HeadlineFigures extends Model {}
HeadlineFigures.init({
  entityPublicId: {
    type: STRING(64),
    allowNull: true,
    field: "enttiy_public_id"
  },
}, { sequelize, modelName: 'headlineFigures', tableName: 'headline_figures', timestamps: false });
HeadlineFigures.removeAttribute('id');

module.exports = HeadlineFigures;