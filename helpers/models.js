const { Op } = require('sequelize');
const moment = require('moment');
const sequelize = require('services/sequelize');

const groupSearchItems = (search, overrides = {}) => {
  const groupedSearch = { project: {}, milestone: {}, projectField: [], milestoneField: {} };

  for (const attribute of Object.keys(search || {})) {
    const options = search[attribute];

    if(sequelize.models.project.includes(attribute)) {
      groupedSearch.project[attribute] = sequelize.models.project.createSearch(attribute, options, overrides.Project);
    } else if(sequelize.models.milestone.includes(attribute)) {
      groupedSearch.milestone[attribute] = sequelize.models.milestone.createSearch(attribute, options, overrides.Milestone);
    } else if(sequelize.models.projectFieldEntry.includes(attribute)) {
      const filter = sequelize.models.projectFieldEntry.createSearch(attribute, options, overrides.ProjectFieldEntry);
      groupedSearch.projectField.push(filter);
    }
  }

  return groupedSearch;
};

const transformForView = model => {
  return Object.keys(model.rawAttributes)
    .map(attributeKey => Object.assign({}, model.rawAttributes[attributeKey], { value: model[attributeKey] }))
    .filter(attribute => attribute.displayName)
    .map(attribute => {
      return {
        id: attribute.fieldName,
        name: attribute.displayName,
        value: attribute.value
      }
    });
};

const parseFieldEntryValue = (value, type) => {
  if(type) {
    switch(type) {
      case 'boolean':
        value = value === '1';
        break;
      case 'integer':
        value = parseInt(value);
        break;
      case 'float':
        value = parseFloat(value);
        break;
    }
  }
  return value;
};

const createFilterOptions = (attribute, options) => {
  if (attribute.includes('date')) {
    const dates = options.map(date => moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD'));
    return { [Op.between]: dates };
  }
  return { [Op.or]: options };
};

module.exports = {
  transformForView,
  parseFieldEntryValue,
  createFilterOptions,
  groupSearchItems
};