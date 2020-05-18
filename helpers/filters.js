const Project = require('models/project');
const Milestone = require('models/milestone');
const User = require('models/user');
const ProjectFieldEntry = require('models/projectFieldEntry');
const ProjectField = require('models/projectField');
const Department = require('models/department');
const { Op, literal } = require('sequelize');
const modelUtils = require('helpers/models');
const MilestoneFieldEntry = require('models/milestoneFieldEntry');
const MilestoneField = require('models/milestoneField');

const getFiltersWithCounts = async (attribute, search, user) => {
  const groupedSearch = await modelUtils.groupSearchItems(search, { ProjectFieldEntry: { path: 'projects_count->ProjectFieldEntryFilter' } });
  const searchIgnoreCurrentAttribute = Object.assign({}, groupedSearch.project, { [attribute.field]: { [Op.ne]: null } });

  const attributes = [[literal(`project.${attribute.field}`), 'value']];

  if(attribute.showCount) {
    attributes.push([literal(`COUNT(DISTINCT projects_count.uid)`), 'count']);
  }

  return await Project.findAll({
    attributes,
    include: [
      {
        model: Project,
        as: 'projects_count',
        attributes: [],
        where: searchIgnoreCurrentAttribute,
        required: false,
        include: [
          {
            required: true,
            as: 'ProjectFieldEntryFilter',
            attributes: [],
            model: ProjectFieldEntry,
            where: groupedSearch.projectField
          },
          {
            model: Milestone,
            attributes: [],
            required: true,
            where: groupedSearch.milestone
          }
        ]
      },
      {
        model: Milestone,
        attributes: []
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
  const filters = new Map();

  for(const attributeName of Object.keys(Project.rawAttributes)) {
    const attribute = Project.rawAttributes[attributeName];
    if (!attribute.searchable) continue;

    let options = await getFiltersWithCounts(attribute, search, user);

    filters.set(attribute.fieldName, {
      id: attribute.fieldName,
      name: attribute.displayName,
      type: attribute.type,
      options: options.sort((a, b) => (a.value > b.value) ? 1 : -1)
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
    const projectFieldEntry = ProjectFieldEntry.build({
      value: item.value,
      projectField: {
        id: item.id,
        name: item.name,
        displayName: item.displayName,
        type: item.type
      }
    }, { include: ProjectField });
    const existingField = fields.get(item.name);
    const value = modelUtils.parseFieldEntryValue(projectFieldEntry.value, item.type);

    if(!existingField) {
      fields.set(projectFieldEntry.projectField.name, {
        id: projectFieldEntry.projectField.name,
        name: projectFieldEntry.projectField.displayName,
        type: projectFieldEntry.projectField.type,
        options: [{
          value
        }]
      });
    } else {
      existingField.options.push({
        value
      });
      existingField.options.sort((a, b) => (a.value > b.value) ? 1 : -1);
    }

    return fields;
  }, new Map());
};

const getMilestoneFields = async (search, user) => {
  const response = await MilestoneField.findAll({
    attributes: [
      [literal(`milestoneField.id`), 'id'],
      [literal(`milestoneField.name`), 'name'],
      [literal(`milestoneField.display_name`), 'displayName'],
      [literal(`milestoneField.type`), 'type'],
      [literal(`milestoneFieldEntries.value`), 'value']
    ],
    group: [
      `milestoneField.id`,
      `milestoneField.name`,
      `milestoneField.display_name`,
      `milestoneField.type`,
      `milestoneFieldEntries.value`
    ],
    raw: true,
    includeIgnoreAttributes: false,
    include: [
      {
        model: MilestoneFieldEntry,
        required: true,
        include: [
          {
            model: MilestoneField,
            required: true
          },
          {
            model: Milestone,
            required: true,
            include: [{
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
            }]
          }
        ]
      }
    ]
  });

  return response.reduce((fields, item) => {
    const milestoneFieldEntry = MilestoneFieldEntry.build({
      value: item.value,
      milestoneField: {
        id: item.id,
        name: item.name,
        displayName: item.displayName,
        type: item.type
      }
    }, { include: MilestoneField });
    const existingField = fields.get(item.name);
    const value = modelUtils.parseFieldEntryValue(milestoneFieldEntry.value, item.type);

    if(!existingField) {
      fields.set(milestoneFieldEntry.milestoneField.name, {
        id: milestoneFieldEntry.milestoneField.name,
        name: milestoneFieldEntry.milestoneField.displayName,
        type: milestoneFieldEntry.milestoneField.type,
        options: [{
          value
        }]
      });
    } else {
      existingField.options.push({
        value
      });
      existingField.options.sort((a, b) => (a.value > b.value) ? 1 : -1);
    }

    return fields;
  }, new Map());
};

const getFilters = async (search = {}, user) => {
  const projectFilters = await getProjectCoreFields(search, user);
  const projectFields = await getProjectFields(search, user);
  projectFields.forEach((value, key) => projectFilters.set(key, value));

  const milestoneFilters = new Map();
  const milestoneFields = await getMilestoneFields(search, user);
  milestoneFields.forEach((value, key) => milestoneFilters.set(key, value));

  return new Map([...projectFilters, ...milestoneFilters]);
};

module.exports = {
  getFiltersWithCounts,
  getProjectCoreFields,
  getFilters,
  getProjectFields
};
