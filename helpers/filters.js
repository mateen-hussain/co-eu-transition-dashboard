const Project = require('models/project');
const Milestone = require('models/milestone');
const User = require('models/user');
const ProjectFieldEntry = require('models/projectFieldEntry');
const ProjectField = require('models/projectField');
const Department = require('models/department');
const { Op, literal } = require('sequelize');
const modelUtils = require('helpers/models');
const logger = require('services/logger');

const getFiltersWithCounts = async (attribute, search, user) => {
  const groupedSearch = await modelUtils.groupSearchItems(search, { ProjectFieldEntry: { path: 'projects_count->ProjectFieldEntryFilter'}});
  const searchIgnoreCurrentAttribute = Object.assign({}, groupedSearch.project, { [attribute.field]: { [Op.ne]: null } });

  return await Project.findAll({
    attributes: [
      [literal(`project.${attribute.field}`), 'value'],
      [literal(`COUNT(DISTINCT projects_count.uid)`), 'count']
    ],
    include: [
      {
        model: Project,
        as: 'projects_count',
        attributes: [],
        where: searchIgnoreCurrentAttribute,
        required: false,
        include: [{
          required: true,
          as: 'ProjectFieldEntryFilter',
          attributes: [],
          model: ProjectFieldEntry,
          where: groupedSearch.projectField
        }]
      },
      {
        model: Milestone,
        attributes: [],
        required: true,
        where: groupedSearch.milestone
      },
      {
        model: Department,
        required: true,
        attributes: [],
        include: [{
          attributes: [],
          model: User,
          required: true,
          where: {
            id: user.id
          }
        }]
      }
    ],
    group: [`project.${attribute.field}`],
    raw: true,
    nest: true,
    includeIgnoreAttributes: false
  });
};

const getProjectCoreFields = async (search, user) => {
  const filters = [];
  for(const attributeName of Object.keys(Project.rawAttributes)) {
    const attribute = Project.rawAttributes[attributeName];
    if (!attribute.searchable) continue;

    let options = await getFiltersWithCounts(attribute, search, user);

    filters.push({
      id: attribute.fieldName,
      name: attribute.displayName,
      type: attribute.type,
      options
    });
  }
  return filters;
};

const getProjectFields = async (search, user) => {
  const response = await ProjectField.findAll({
    attributes: [
      [literal(`projectField.id`), 'id'],
      [literal(`projectField.name`), 'name'],
      [literal(`projectField.display_name`), 'displayName'],
      [literal(`projectField.type`), 'type'],
      [literal(`projectFieldEntries.value`), 'value']
    ],
    group: [
      `projectField.id`,
      `projectField.name`,
      `projectField.display_name`,
      `projectField.type`,
      `projectFieldEntries.value`
    ],
    raw: true,
    includeIgnoreAttributes: false,
    include: [
      {
        model: ProjectFieldEntry,
        include: [
          {
            model: ProjectField,
            required: true
          },
          {
            model: Project,
            required: true,
            include: [{
              model: Department,
              required: true,
              include: [{
                model: User,
                required: true,
                where: {
                  id: user.id
                }
              }]
            }]
          }
        ]
      }
    ]
  });

  return response.reduce((fields, item) => {
    const exsistingField = fields.find(field => field.id === item.name);
    const value = modelUtils.parseFieldEntryValue(item.value, item.type);

    if(!exsistingField) {
      fields.push({
        id: item.name,
        name: item.displayName,
        options: [{
          count: item.count,
          value
        }]
      });
    } else {
      exsistingField.options.push({
        count: item.count,
        value
      });
    }

    return fields;
  }, []);
};

const getFilters = async (search = {}, user) => {
  const filters = await getProjectCoreFields(search, user);

  const projectFields = await getProjectFields(search, user);
  filters.push(...projectFields);

  filters.forEach(filter => {
    filter.options = filter.options.sort((a,b) => {
      return a.value > b.value;
    });
  });

  return filters;
};

module.exports = {
  getFiltersWithCounts,
  getProjectCoreFields,
  getFilters,
  getProjectFields
};
