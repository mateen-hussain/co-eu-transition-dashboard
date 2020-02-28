const config = require('config');
const mysql = require("mysql");

const connection = mysql.createConnection({
  host: process.env.DATABASE_HOST || '127.0.0.1',
  user: 'root',
  password: 'password',
  database: 'dashboard',
  port: 3306
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