const { STRING, Model } = require('sequelize');
const sequelize = require('services/sequelize');

class User extends Model {}
User.init({
  name: STRING,
  email: STRING,
  password: STRING
}, { sequelize, modelName: 'users' });

module.exports = User;