const { STRING, Model, ENUM } = require('sequelize');
const sequelize = require('services/sequelize');

class User extends Model {}
User.init({
  name: STRING,
  email: STRING,
  password: STRING,
  role: {
    type: ENUM('admin', 'user')
  }
}, { sequelize, modelName: 'users' });

module.exports = User;