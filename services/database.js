const { services } = require('config');
const mysql = require("mysql");

const connection = mysql.createConnection({
  host: services.mysql.host,
  user: services.mysql.user,
  password: services.mysql.password,
  database: services.mysql.database,
  port: parseInt(services.mysql.port)
});

connection.connect(function (err) {
  if (err) {
    console.error("error connecting " + err.stack);
    return null;
  }
  console.log("connected as id " + this.threadId);
});

const getProjects = filters => {
  return new Promise((resolve, reject) => {
    connection.query('select * from projects inner join milestones on projects.id = milestones.project_id', function (error, results, fields) {
      if (error) reject(error);
      resolve(results);
    });
  });
};

module.exports = {
  getProjects
};