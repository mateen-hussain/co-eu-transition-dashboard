const Project = require('models/project');
const Milestone = require('models/milestone');
const User = require('models/user');
const ProjectFieldEntry = require('models/projectFieldEntry');
const ProjectField = require('models/projectField');
const Department = require('models/department');
const { Op, literal } = require('sequelize');
const modelUtils = require('helpers/models');

const getFiltersWithCounts = async (attribute, search, user) => {
  const groupedSearch = modelUtils.groupSearchItems(search, { ProjectFieldEntry: { path: 'projects_count->ProjectFieldEntryFilter'}});
  const searchIgnoreCurrentAttribute = Object.assign({}, groupedSearch.project, { [attribute.fieldName]: { [Op.ne]: null } });

  return await Project.findAll({
    attributes: [
      [literal(`project.${attribute.fieldName}`), 'value'],
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
          where: {
            [Op.and]: groupedSearch.projectField
          }
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
    group: [`project.${attribute.fieldName}`],
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
      options
    });
  }
  return filters;
};

const getProjectFields = async (search, user) => {
  const groupedSearch = modelUtils.groupSearchItems(search, { ProjectFieldEntry: { path: 'projectFieldEntries->project_field_entry_count'}});

  const response = await ProjectField.findAll({
    attributes: [
      [literal(`projectField.id`), 'id'],
      [literal(`projectField.name`), 'name'],
      [literal(`projectField.type`), 'type'],
      [literal(`projectFieldEntries.value`), 'value'],
      // [literal('COUNT(`projectFieldEntries->project_field_entry_count`.value)'), 'count']
    ],
    group: [
      `projectField.id`,
      `projectField.name`,
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
            model: ProjectFieldEntry,
            // where: {
            //   [Op.and]: groupedSearch.projectField
            // },
            required: false,
            as: 'project_field_entry_count',
            include: [
              {
                model: Project,
                required: true,
                where: groupedSearch.project,
                include: [
                  {
                    model: Milestone,
                    include: { all: true, nested: true },
                    required: true,
                    where: groupedSearch.milestone
                  }
                ]
              }
            ]
          },
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
    const exsistingField = fields.find(field => field.name === item.name);
    const value = modelUtils.parseFieldEntryValue(item.value, item.type);

    if(!exsistingField) {
      fields.push({
        id: JSON.stringify({
          path: 'projects->ProjectFieldEntryFilter',
          id: item.id
        }),
        name: item.name,
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
  getFilters
};