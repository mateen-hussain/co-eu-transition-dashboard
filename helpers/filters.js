const Projects = require('models/projects');
const Milestones = require('models/milestones');
const sequelize = require('sequelize');

const getFiltersWithCounts = async (attribute, search) => {
  const searchIgnoreCurrentAttribute = Object.assign({}, search.projects);
  delete searchIgnoreCurrentAttribute[attribute.fieldName];

  const attributes = [];
  let group;

  if(attribute.showCount) {
    attributes.push([sequelize.literal(`projects.${attribute.fieldName}`), 'value']);
    attributes.push([sequelize.literal(`COUNT(DISTINCT milestones.projectId)`), 'count']);

    group = [];
    group.push(`${attribute.fieldName}`);
  } else {
    attributes.push([sequelize.literal(`DISTINCT projects.${attribute.fieldName}`), 'value']);
  }

  return await Projects.findAll({
    attributes: attributes,
    where: searchIgnoreCurrentAttribute,
    include: [{
      model: Milestones,
      attributes: [],
      where: search.milestones,
      required: true
    }],
    group,
    raw: true,
    nest: true
  });
};

const applyDefaultOptions = (attribute, options) => {
  if (attribute.values) {
    return attribute.values.map(value => {
      const found = options.find(r => r.value === value);
      return {
        value,
        count: found ? found.count : 0
      }
    });
  }

  return options;
};

const getFilters = async (search = {}) => {
  const filters = [];

  for(const attributeName of Object.keys(Projects.rawAttributes)) {
    const attribute = Projects.rawAttributes[attributeName];
    if (!attribute.displayName) continue;

    let options = await getFiltersWithCounts(attribute,search);
    options = applyDefaultOptions(attribute, options);

    filters.push({
      id: attribute.fieldName,
      name: attribute.displayName,
      options
    });
  }

  return filters;
};

module.exports = {
  getFiltersWithCounts,
  applyDefaultOptions,
  getFilters
};