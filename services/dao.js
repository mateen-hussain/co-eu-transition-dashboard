const sequelize = require('services/sequelize');
const Department = require('models/department');
const Project = require('models/project');
const ProjectField = require('models/projectField');
const ProjectFieldEntry = require('models/projectFieldEntry');
const Milestone = require('models/milestone');
const MilestoneField = require('models/milestoneField');
const MilestoneFieldEntry = require('models/milestoneFieldEntry');
const modelUtils = require('helpers/models');


class DAO {
  constructor(options = {}) {
    this.sequelize = null;
    this.projectFields = null;
    this.milestoneFields = null;

    if (options.sequelize) {
      this.sequelize = options.sequelize;
    } else {
      this.sequelize = sequelize;
    }
  }

  generateFieldMap(fields) {
    return fields.reduce( (acc,field) => {
      acc[field.name] = field.id;
      return acc;
    },{});
  }

  async getProjectFieldMap() {
    if (this.projectFields) {
      return this.projectFields;
    }
    this.projectFields = this.generateFieldMap(await ProjectField.findAll());
    return this.projectFields;
  }

  async getMilestoneFieldMap() {
    if (this.milestoneFields) {
      return this.milestoneFields;
    }
    this.milestoneFields = this.generateFieldMap(await MilestoneField.findAll());
    return this.milestoneFields;
  }

  getFieldId(fieldMap,filter) {
    if (filter.id) {
      return filter.id;
    } else if (filter.name) {
      const fieldId = fieldMap[filter.name];
      if (fieldId) {
        return fieldId;
      }
    }
    throw(`Could not find field ${JSON.stringify(filter)}`);
  }

  async getProjectFieldId(filter) {
    return this.getFieldId(await this.getProjectFieldMap(),filter);
  }

  async getMilestoneFieldId(filter) {
    return this.getFieldId(await this.getMilestoneFieldMap(),filter);
  }

  quoteIdentifier(value) {
    return this.sequelize.getQueryInterface().QueryGenerator.quoteIdentifier(value);
  }

  generateMatch(table,field,value) {
    const translatedValue = modelUtils.createFilterOptions(field,value);
    return this.sequelize.getQueryInterface().QueryGenerator.getWhereConditions({
      [field]: translatedValue
    },table);
  }

  generateFilterAlias(type,field) {
    return `${type}_field_id_${field}`
  }

  generateProjectProjectFieldFilter(fieldId,value) {
    const aliasName = this.generateFilterAlias("project",fieldId);
    return `
      INNER JOIN project_field_entry AS ${aliasName} ON (
        project.uid = ${this.quoteIdentifier(aliasName)}.project_uid
        AND ${this.generateMatch(aliasName,"project_field_id",fieldId)}
        AND ${this.generateMatch(aliasName,"value",value)}
      )
    `;
  }

  generateProjectMilestoneFieldFilter(fieldId,value) {
    const aliasName = this.generateFilterAlias("milestone",fieldId);
    return `
      JOIN (
          SELECT project.uid
          FROM
              project INNER JOIN milestone ON (project.uid = milestone.project_uid)
              INNER JOIN milestone_field_entry ON (
                milestone.uid = milestone_field_entry.milestone_uid
                AND ${this.generateMatch("milestone_field_entry","milestone_field_id",fieldId)}
              )
          WHERE
              milestone.project_uid = project.uid
              AND ${this.generateMatch("milestone_field_entry","value",value)}
          GROUP BY
              project.uid
      ) AS ${this.quoteIdentifier(aliasName)} ON (${this.quoteIdentifier(aliasName)}.uid = project.uid)
    `;
  }

  generateProjectMilestoneFilter(field,value) {
    const aliasName = this.generateFilterAlias("milestones",field);
    return `
      JOIN (
          SELECT project.uid
          FROM
              project INNER JOIN milestone ON (project.uid = milestone.project_uid)
          WHERE
              milestone.project_uid = project.uid
              AND ${this.generateMatch("milestone",field,value)}
          GROUP BY
              project.uid
      ) AS ${this.quoteIdentifier(aliasName)} ON (${this.quoteIdentifier(aliasName)}.uid = project.uid)
    `;
  }

  async generateProjectQuery(userId, projectFilters = [],projectFieldFilters = [], milestoneFilters = [], milestoneFieldFilters = []) {
    const dao = this;

    let query = `
      SELECT
        project.uid, project.department_name AS departmentName, project.title, project.impact,
        project.sro, project.description, project.created_at, project.updated_at,

        \`department\`.name AS \`department.name\`,

        \`projectFieldEntries\`.project_field_id AS \`projectFieldEntries.fieldId\`,
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
        INNER JOIN department ON (project.department_name = department.name) 
        LEFT OUTER JOIN project_field_entry AS \`projectFieldEntries\` ON (project.uid = \`projectFieldEntries\`.project_uid)
        LEFT OUTER JOIN project_field AS \`projectFieldEntries->projectField\` ON (\`projectFieldEntries->projectField\`.id = \`projectFieldEntries\`.project_field_id)
    `;

    for await (const filter of projectFieldFilters) {
      const fieldId = await dao.getProjectFieldId(filter);
      query += this.generateProjectProjectFieldFilter(fieldId,filter.value);
    }

    for await (const filter of milestoneFieldFilters) {
      const fieldId = await dao.getMilestoneFieldId(filter);
      query += this.generateProjectMilestoneFieldFilter(fieldId,filter.value);
    }

    milestoneFilters.forEach( filter => {
      query += this.generateProjectMilestoneFilter(filter.name,filter.value);
    });

    query += `
      WHERE
        ${this.generateMatch("user","id",userId)}
    `;

    await projectFilters.forEach( filter => {
      query += `
        AND ${this.generateMatch("project",filter.name,filter.value)}
      `;
    });

    return [query,{}];
  }

  generateMilestoneMilestoneFieldFilter(fieldId,value) {
    const aliasName = this.generateFilterAlias("milestone",fieldId);
    return `
      INNER JOIN milestone_field_entry AS ${aliasName} ON (
        milestones.uid = ${this.quoteIdentifier(aliasName)}.milestone_uid
        AND ${this.generateMatch(aliasName,"milestone_field_id",fieldId)}
        AND ${this.generateMatch(aliasName,"value",value)}
      )
    `;
  }

  generateMilestoneProjectFieldFilter(fieldId,value) {
    const aliasName = this.generateFilterAlias("project",fieldId);
    return `
      JOIN (
          SELECT project.uid
          FROM
              project INNER JOIN project_field_entry ON (
                project.uid = project_field_entry.project_uid
                AND ${this.generateMatch("project_field_entry","project_field_id",fieldId)}
              )
          WHERE
              ${this.generateMatch("project_field_entry","value",value)}
          GROUP BY
              project.uid
      ) AS ${this.quoteIdentifier(aliasName)} ON (${this.quoteIdentifier(aliasName)}.uid = project.uid)
    `;
  }

  async generateMilestoneQuery(userId, projectFilters = [], projectFieldFilters = [], milestoneFilters = [], milestoneFieldFilters = []) {
    const dao = this;

    let query = `
      SELECT
        project.uid, project.department_name as DepartmentName, project.title, project.impact,
        project.sro, project.description, project.created_at, project.updated_at,

        \`department\`.name AS \`department.name\`,

        \`milestones\`.uid AS \`milestones.uid\`,
        \`milestones\`.project_uid AS \`milestones.projectUid\`,
        \`milestones\`.description AS \`milestones.description\`,
        \`milestones\`.date AS \`milestones.date\`,
        \`milestones\`.created_at AS \`milestones.created_at\`,
        \`milestones\`.updated_at AS \`milestones.updated_at\`,

        \`milestones->milestoneFieldEntries\`.milestone_field_id AS \`milestones.milestoneFieldEntries.fieldId\`,
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
        INNER JOIN department ON (project.department_name = department.name)
        LEFT OUTER JOIN milestone AS milestones ON (project.uid = milestones.project_uid)
        LEFT OUTER JOIN milestone_field_entry AS \`milestones->milestoneFieldEntries\` ON (milestones.uid = \`milestones->milestoneFieldEntries\`.milestone_uid)
        LEFT OUTER JOIN milestone_field AS \`milestones->milestoneFieldEntries->milestoneField\` ON (\`milestones->milestoneFieldEntries->milestoneField\`.id = \`milestones->milestoneFieldEntries\`.milestone_field_id)
    `;

    for await (const filter of projectFieldFilters) {
      const fieldId = await dao.getProjectFieldId(filter);
      query += this.generateMilestoneProjectFieldFilter(fieldId,filter.value);
    }

    for await (const filter of milestoneFieldFilters) {
      const fieldId = await dao.getMilestoneFieldId(filter);
      query += this.generateMilestoneMilestoneFieldFilter(fieldId,filter.value);
    }

    query += `
      WHERE
        ${this.generateMatch("user","id",userId)}
    `;

    projectFilters.forEach( filter => {
      query += `
        AND ${this.generateMatch("project",filter.name,filter.value)}
      `;
    });

    milestoneFilters.forEach( filter => {
      query += `
        AND ${this.generateMatch("milestones",filter.name,filter.value)}
      `;
    });

    return [query,{}];
  }

  async getProjectFields(userId, projectFilters = [], projectFieldFilters = [], milestoneFilters = [], milestoneFieldFilters = []) {
    const [query,binds] = await this.generateProjectQuery(userId,projectFilters,projectFieldFilters,milestoneFilters,milestoneFieldFilters);

    const options = {
      "hasJoin": true,
      "include": [
        {
          "model": ProjectFieldEntry,
          "include": {
            "model": ProjectField
          }
        },
        {
          "model": Department
        }
      ],
      "replacements": binds,
      "type": this.sequelize.QueryTypes.SELECT,
      "model": Project,
      "mapToModel": true
    };


    Project._validateIncludedElements(options);
    const result = await this.sequelize.query(query,options);
    return result;
  }

  async getMilestoneFields(userId, projectFilters = [], projectFieldFilters = [], milestoneFilters = [], milestoneFieldFilters = []) {
    const [query,binds] = await this.generateMilestoneQuery(userId,projectFilters,projectFieldFilters,milestoneFilters,milestoneFieldFilters);

    const options = {
      "hasJoin": true,
      "include": [
        {
          "model": Milestone,
          "include": {
            "model": MilestoneFieldEntry,
            "include": {
              "model": MilestoneField
            }
          }
        },
        {
          "model": Department
        }
      ],
      "replacements": binds,
      "type": this.sequelize.QueryTypes.SELECT,
      "model": Project,
      "mapToModel": true
    };

    Project._validateIncludedElements(options);
    const result = await this.sequelize.query(query,options);
    return result;
  }

  async getAllFields(userId, projectFilters = [],milestoneFilters = []) {
    let projects = await this.getProjectFields(userId,projectFilters,milestoneFilters);
    const milestoneFields = await this.getMilestoneFields(userId,projectFilters,milestoneFilters);
    const milestoneMap = milestoneFields.reduce( (acc,project) => {
      acc[project.uid] = project.milestones;
      return acc;
    }, {});

    
    projects.forEach( (project,index) => {
      const milestones =  milestoneMap[project.uid];
      projects[index].dataValues.milestones = milestones;
      projects[index].milestones = milestones;
    });

    return projects;
  }

  async collateFilters(filters = {}) {
    let projectFieldFilters = [];
    let projectFilters = [];
    let milestoneFilters = [];
    let milestoneFieldFilters = [];

    const projectFieldMap = await this.getProjectFieldMap();
    const milestoneFieldMap = await this.getMilestoneFieldMap();

    Object.keys(filters).forEach( filter => {
      if (projectFieldMap[filter]) {
        projectFieldFilters.push({
          "name": filter,
          "value": filters[filter]
        });
      } else if (milestoneFieldMap[filter]) {
        milestoneFieldFilters.push({
          "name": filter,
          "value": filters[filter]
        });
      } else if (Project.rawAttributes[filter]) {
        projectFilters.push({
          "name": Project.rawAttributes[filter].field,
          "value": filters[filter]
        });
      } else if (Milestone.rawAttributes[filter]) {
        milestoneFilters.push({
          "name": Milestone.rawAttributes[filter].field,
          "value": filters[filter]
        });
      } else {
        throw(`Could not determine filter type for ${filter}`);
      }
    });

    return [projectFilters,projectFieldFilters,milestoneFilters,milestoneFieldFilters];
  }

  async getAllData(userId, filters = {}) {
    const [projectFilters,projectFieldFilters,milestoneFilters,milestoneFieldFilters] = await this.collateFilters(filters);
    /*
    console.log(JSON.stringify(projectFilters));
    console.log(JSON.stringify(projectFieldFilters));
    console.log(JSON.stringify(milestoneFilters));
    console.log(JSON.stringify(milestoneFieldFilters));
    */
    let projects = await this.getProjectFields(userId,projectFilters,projectFieldFilters,milestoneFilters,milestoneFieldFilters);
    const milestoneFields = await this.getMilestoneFields(userId,projectFilters,projectFieldFilters,milestoneFilters,milestoneFieldFilters);
    const milestoneMap = milestoneFields.reduce( (acc,project) => {
      acc[project.uid] = project.milestones;
      return acc;
    }, {});

    
    projects.forEach( (project,index) => {
      const milestones =  milestoneMap[project.uid];
      projects[index].dataValues.milestones = milestones;
      projects[index].milestones = milestones;
    });

    return projects;
  }


}

module.exports = DAO;
