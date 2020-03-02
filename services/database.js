const { services } = require('config');
const mysql = require("mysql");
const logger = require('services/logger');

const connection = mysql.createConnection({
  host: services.mysql.host,
  user: services.mysql.user,
  password: services.mysql.password,
  database: services.mysql.database,
  port: parseInt(services.mysql.port)
});

connection.connect(err => {
  if (err) {
    return logger.error(err);
  }
});

const getProjects = () => {
  return new Promise((resolve, reject) => {
    connection.query('select * from projects inner join milestones on projects.id = milestones.project_id', function (error, results) {
      if (error) reject(error);
      resolve(results);
    });
  });
};

module.exports = {
  getProjects
};