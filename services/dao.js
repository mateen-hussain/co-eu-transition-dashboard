const sequelize = require('services/sequelize');
const project = require('models/project');
const projectField = require('models/projectField');
const projectFieldEntry = require('models/projectFieldEntry');
const milestone = require('models/milestone');
const milestoneField = require('models/milestoneField');
const milestoneFieldEntry = require('models/milestoneFieldEntry');

function generateMatch(fieldName,value) {
  if (Array.isArray(value)) {
    return `IN (:${fieldName})`;
  }

  return `= :${fieldName}`;
}

function generateJoinNames(type,field,value) {
  const aliasFieldIdName = `${type}_field_id_${field}`;
  const aliasValueName = `${type}_field_${field}`;
  let binds = {};
  binds[aliasFieldIdName] = field;
  binds[aliasValueName] = value;

  return [aliasFieldIdName,aliasValueName,binds];
}

function generateProjectProjectFieldFilter(field,value) {
  const [aliasFieldIdName,aliasValueName,binds] = generateJoinNames("project",field,value);
  return [
    `
      INNER JOIN project_field_entry AS ${aliasFieldIdName} ON (
        project.uid = ${aliasFieldIdName}.project_uid
        AND ${aliasFieldIdName}.project_field_id = :${aliasFieldIdName}
        AND ${aliasFieldIdName}.value ${generateMatch(aliasValueName,value)}
      )
    `,
    binds
  ];
}

function generateProjectMilestoneFieldFilter(field,value) {
  const [aliasFieldIdName,aliasValueName,binds] = generateJoinNames("milestone",field,value);
  return [
    `
      JOIN (
          SELECT project.uid
          FROM
              project INNER JOIN milestone ON (project.uid = milestone.project_uid)
              INNER JOIN milestone_field_entry ON (
                milestone.uid = milestone_field_entry.milestone_uid
                AND milestone_field_entry.milestone_field_id = :${aliasFieldIdName}
              )
          WHERE
              milestone.project_uid = project.uid
              AND milestone_field_entry.value ${generateMatch(aliasValueName,value)}
          GROUP BY
              project.uid
      ) AS ${aliasFieldIdName} ON (${aliasFieldIdName}.uid = project.uid)
    `,
    binds
  ];
}

function generateProjectQuery(userId, projectFilters = [],milestoneFilters = []) {
  let binds = {
    "userId": userId,
  };

  let query = `
    SELECT
      project.uid, project.department_name, project.title, project.impact, project.is_completed,
      project.sro, project.description, project.created_at, project.updated_at,

      \`projectFieldEntries\`.project_field_id AS \`projectFieldEntries.projectFieldId\`,
      \`projectFieldEntries\`.project_uid AS \`projectFieldEntries.projectUid\`,
      \`projectFieldEntries\`.created_at AS \`projectFieldEntries.created_at\`,
      \`projectFieldEntries\`.updated_at AS \`projectFieldEntries.updated_at\`,
      \`projectFieldEntries\`.value AS \`projectFieldEntries.value\`,

      \`projectFieldEntries->projectField\`.id AS \`projectFieldEntries.projectField.id\`,
      \`projectFieldEntries->projectField\`.name AS \`projectFieldEntries.projectField.name\`,
      \`projectFieldEntries->projectField\`.display_name AS \`projectFieldEntries.projectField.displayName\`,
      \`projectFieldEntries->projectField\`.type AS \`projectFieldEntries.projectField.type\`,
      \`projectFieldEntries->projectField\`.config AS \`projectFieldEntries.projectField.config\`,
      \`projectFieldEntries->projectField\`.is_active AS \`projectFieldEntries.projectField.isActive\`,
      \`projectFieldEntries->projectField\`.is_required AS \`projectFieldEntries.projectField.isRequired\`,
      \`projectFieldEntries->projectField\`.import_column_name AS \`projectFieldEntries.projectField.importColumnName\`,
      \`projectFieldEntries->projectField\`.group AS \`projectFieldEntries.projectField.group\`,
      \`projectFieldEntries->projectField\`.order AS \`projectFieldEntries.projectField.order\`,
      \`projectFieldEntries->projectField\`.description AS \`projectFieldEntries.projectField.description\`

    FROM
      user INNER JOIN department_user ON (user.id = department_user.user_id)
      INNER JOIN project ON (department_user.department_name = project.department_name)
      LEFT OUTER JOIN project_field_entry AS \`projectFieldEntries\` ON (project.uid = \`projectFieldEntries\`.project_uid)
      LEFT OUTER JOIN project_field AS \`projectFieldEntries->projectField\` ON (\`projectFieldEntries->projectField\`.id = \`projectFieldEntries\`.project_field_id)
  `;

  projectFilters.forEach( filter => {
    const [sql,newBinds] = generateProjectProjectFieldFilter(filter.id,filter.value);
    query += `
      ${sql}
    `;
    Object.assign(binds,newBinds);
  });

  milestoneFilters.forEach( filter => {
    const [sql,newBinds] = generateProjectMilestoneFieldFilter(filter.id,filter.value);
    query += `
      ${sql}
    `;
    Object.assign(binds,newBinds);
  });

  query += `
    WHERE
      user.id = :userId
  `;

  return [query,binds];
}

function generateMilestoneMilestoneFieldFilter(field,value) {
  const [aliasFieldIdName,aliasValueName,binds] = generateJoinNames("milestone",field,value);
  return [
    `
      INNER JOIN milestone_field_entry AS ${aliasFieldIdName} ON (
        milestones.uid = ${aliasFieldIdName}.milestone_uid
        AND ${aliasFieldIdName}.milestone_field_id = :${aliasFieldIdName}
        AND ${aliasFieldIdName}.value ${generateMatch(aliasValueName,value)}
      )
    `,
    binds
  ];
}

function generateMilestoneProjectFieldFilter(field,value) {
  const [aliasFieldIdName,aliasValueName,binds] = generateJoinNames("project",field,value);
  return [
    `
      JOIN (
          SELECT project.uid
          FROM
              project INNER JOIN project_field_entry ON (
                project.uid = project_field_entry.project_uid
                AND project_field_entry.project_field_id = :${aliasFieldIdName}
              )
          WHERE
              project_field_entry.value ${generateMatch(aliasValueName,value)}
          GROUP BY
              project.uid
      ) AS ${aliasFieldIdName} ON (${aliasFieldIdName}.uid = project.uid)
    `,
    binds
  ];
}


function generateMilestoneQuery(userId, projectFilters = [],milestoneFilters = []) {
  let binds = {
    "userId": userId,
  };

  let query = `
    SELECT
      project.uid, project.department_name, project.title, project.impact, project.is_completed,
      project.sro, project.description, project.created_at, project.updated_at,

      \`milestones\`.uid AS \`milestones.uid\`,
      \`milestones\`.project_uid AS \`milestones.projectUid\`,
      \`milestones\`.description AS \`milestones.description\`,
      \`milestones\`.date AS \`milestones.date\`,
      \`milestones\`.created_at AS \`milestones.created_at\`,
      \`milestones\`.updated_at AS \`milestones.updated_at\`,

      \`milestones->milestoneFieldEntries\`.milestone_field_id AS \`milestones.milestoneFieldEntries.milestoneFieldId\`,
      \`milestones->milestoneFieldEntries\`.milestone_uid AS \`milestones.milestoneFieldEntries.milestoneUid\`,
      \`milestones->milestoneFieldEntries\`.value AS \`milestones.milestoneFieldEntries.value\`,
      \`milestones->milestoneFieldEntries\`.created_at AS \`milestones.milestoneFieldEntries.created_at\`,
      \`milestones->milestoneFieldEntries\`.updated_at AS \`milestones.milestoneFieldEntries.updated_at\`,

      \`milestones->milestoneFieldEntries->milestoneField\`.id AS \`milestones.milestoneFieldEntries.milestoneField.id\`,
      \`milestones->milestoneFieldEntries->milestoneField\`.name AS \`milestones.milestoneFieldEntries.milestoneField.name\`,
      \`milestones->milestoneFieldEntries->milestoneField\`.display_name AS \`milestones.milestoneFieldEntries.milestoneField.displayName\`,
      \`milestones->milestoneFieldEntries->milestoneField\`.type AS \`milestones.milestoneFieldEntries.milestoneField.type\`,
      \`milestones->milestoneFieldEntries->milestoneField\`.config AS \`milestones.milestoneFieldEntries.milestoneField.config\`,
      \`milestones->milestoneFieldEntries->milestoneField\`.is_active AS \`milestones.milestoneFieldEntries.milestoneField.isActive\`,
      \`milestones->milestoneFieldEntries->milestoneField\`.is_required AS \`milestones.milestoneFieldEntries.milestoneField.isRequired\`,
      \`milestones->milestoneFieldEntries->milestoneField\`.import_column_name AS \`milestones.milestoneFieldEntries.milestoneField.importColumnName\`,
      \`milestones->milestoneFieldEntries->milestoneField\`.order AS \`milestones.milestoneFieldEntries.milestoneField.order\`,
      \`milestones->milestoneFieldEntries->milestoneField\`.description AS \`milestones.milestoneFieldEntries.milestoneField.description\`

    FROM
      user INNER JOIN department_user ON (user.id = department_user.user_id)
      INNER JOIN project ON (department_user.department_name = project.department_name)
      LEFT OUTER JOIN milestone AS milestones ON (project.uid = milestones.project_uid)
      LEFT OUTER JOIN milestone_field_entry AS \`milestones->milestoneFieldEntries\` ON (milestones.uid = \`milestones->milestoneFieldEntries\`.milestone_uid)
      LEFT OUTER JOIN milestone_field AS \`milestones->milestoneFieldEntries->milestoneField\` ON (\`milestones->milestoneFieldEntries->milestoneField\`.id = \`milestones->milestoneFieldEntries\`.milestone_field_id)
  `;

  projectFilters.forEach( filter => {
    const [sql,newBinds] = generateMilestoneProjectFieldFilter(filter.id,filter.value);
    query += `
      ${sql}
    `;
    Object.assign(binds,newBinds);
  });

  milestoneFilters.forEach( filter => {
    const [sql,newBinds] = generateMilestoneMilestoneFieldFilter(filter.id,filter.value);
    query += `
      ${sql}
    `;
    Object.assign(binds,newBinds);
  });

  query += `
    WHERE
      user.id = :userId
  `;

  return [query,binds];
}

const getProjectFields = async (userId, projectFilters = [],milestoneFilters = []) => {
  const [query,binds] = generateProjectQuery(userId,projectFilters,milestoneFilters);

  const options = {
    "hasJoin": true,
    "include": [{
      "model": projectFieldEntry,
      "include": {
        "model": projectField
      }
    }],
    "replacements": binds,
    "type": sequelize.QueryTypes.SELECT
  };

  project._validateIncludedElements(options);
  const result = await sequelize.query(query,options);
  return result;
}

const getMilestoneFields = async (userId, projectFilters = [],milestoneFilters = []) => {
  const [query,binds] = generateMilestoneQuery(userId,projectFilters,milestoneFilters);

  const options = {
    "hasJoin": true,
    "include": [{
      "model": milestone,
      "include": {
        "model": milestoneFieldEntry,
        "include": {
          "model": milestoneField
        }
      }
    }],
    "replacements": binds,
    "type": sequelize.QueryTypes.SELECT
  };

  project._validateIncludedElements(options);
  const result = await sequelize.query(query,options);
  return result;
}

module.exports = {
  getProjectFields,
  getMilestoneFields
};
