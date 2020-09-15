const { Model, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');

class EntityUser extends Model {}
EntityUser.init({
  entityId: {
    type: INTEGER,
    field: "entity_id",
    primaryKey: true
  },
  userId: {
    type: INTEGER,
    field: "user_id",
    primaryKey: true
  }
}, { sequelize, modelName: 'entityUser', tableName: 'entity_user', timestamps: false });
EntityUser.removeAttribute('id');

module.exports = EntityUser;
