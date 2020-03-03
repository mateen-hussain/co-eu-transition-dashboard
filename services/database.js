const { services } = require('config');
const mysql = require("mysql");
const logger = require('services/logger');
const filterColumns = ['department', 'project_name', 'impact', 'hmg_confidence', 'citizen_readiness', 'business_readiness', 'eu_state_confidence'];

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

const executeQuery = query => {
  return new Promise((resolve, reject) => {
    connection.query(query, function (error, results) {
      if (error) reject(error);
      resolve(results);
    });
  });
};

const getProjects = async (filters = {}) => {
  let query = 'select * from projects';

  Object.keys(filters).forEach((filter, index) => {
    if (index === 0) {
      query += ` WHERE `;
    } else {
      query += ` AND `;
    }

    const options = filters[filter].map(filter => `'${filter}'`);
    query += `${filter} IN (${options.join(',')})`;
  });

  return await executeQuery(query);
};

const getFilters = async () => {
  const filters = [];

  for(const column of filterColumns) {
    const options = await executeQuery(`SELECT ${column} as value, COUNT(${column}) as count FROM projects GROUP BY ${column}`);

    if(options && options.length) {
      filters.push({
        name: column,
        options
      });
    }
  }

  return filters;
};

module.exports = {
  executeQuery,
  getProjects,
  getFilters,
  connection
};