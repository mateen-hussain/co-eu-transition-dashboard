const Projects = require('models/projects');
const Milestones = require('models/milestones');
const sequelize = require('sequelize');

const getFiltersWithCounts = async (attribute, search) => {
  const searchIgnoreCurrentAttribute = Object.assign({}, search.projects);
  delete searchIgnoreCurrentAttribute[attribute.fieldName];

  return await Projects.findAll({
    attributes: [
      [sequelize.literal(`projects.${attribute.fieldName}`), 'value'],
      [sequelize.literal(`COUNT(DISTINCT milestones.projectId)`), 'count']
    ],
    where: searchIgnoreCurrentAttribute,
    include: [{
      model: Milestones,
      attributes: [],
      where: search.milestones,
      required: true
    }],
    group: [`${attribute.fieldName}`],
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