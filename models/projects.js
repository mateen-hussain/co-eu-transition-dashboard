const database = require('services/database');

const filterColumns = ['department', 'project_name', 'impact', 'hmg_confidence', 'citizen_readiness', 'business_readiness', 'eu_state_confidence'];

const executeQuery = query => {
  return new Promise((resolve, reject) => {
    database.connection.query(query, function (error, results) {
      if (error) reject(error);
      resolve(results);
    });
  });
};

const getFilterQuery = (queryData = {}) => {
  let query = '';

  Object.keys(queryData).forEach((filter, index) => {
    if (index === 0) {
      query += `WHERE `;
    } else {
      query += ` AND `;
    }

    const options = queryData[filter].map(filter => `'${filter}'`);
    query += `CAST(${filter} as CHAR) IN (${options.join(',')})`;
  });

  return query;
};

const getProjects = async (queryData = {}) => {
  const query = `
    SELECT *
    FROM projects
    ${getFilterQuery(queryData)}
  `;

  return await executeQuery(query);
};

const getFilters = async (queryData = {}) => {
  const filters = [];

  for(const column of filterColumns) {
    const queryDataFiltered = Object.keys(queryData)
      .filter(query => query !== column)
      .reduce((obj, key) => {
        obj[key] = queryData[key];
        return obj;
      }, {});

    const query = `
      SELECT DISTINCT(projects.${column}) as value, COALESCE(projects_count.count, 0) as count
      FROM projects
      LEFT JOIN (
        SELECT ${column}, COUNT(*) as count
        FROM projects
        ${getFilterQuery(queryDataFiltered)}
        GROUP BY projects.${column}
      ) as projects_count ON projects_count.${column} = projects.${column}
    `;

    const options = await executeQuery(query);

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
  getFilters,
  getProjects
}