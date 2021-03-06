const { Op } = require('sequelize');
const moment = require('moment');
const sequelize = require('services/sequelize');
const { truthy } = require('./utils');

const groupSearchItems = async (search, overrides = {}) => {
  const groupedSearch = { project: {}, milestone: {}, projectField: [], milestoneField: [] };
  const projectFields = await sequelize.models.projectField.findAll();
  const milestoneFields = await sequelize.models.milestoneField.findAll();

  const findProjectFields = attribute => {
    return projectFields.find(projectField => projectField.name === attribute);
  };

  const findMilestoneFields = attribute => {
    return milestoneFields.find(milestoneField => milestoneField.name === attribute);
  };

  for (const attribute of Object.keys(search || {})) {
    const options = search[attribute];

    if(sequelize.models.project.includes(attribute)) {
      groupedSearch.project[attribute] = sequelize.models.project.createSearch(attribute, options, overrides.Project);
    } else if(sequelize.models.milestone.includes(attribute)) {
      groupedSearch.milestone[attribute] = sequelize.models.milestone.createSearch(attribute, options, overrides.Milestone);
    } else {
      const projectField = findProjectFields(attribute);
      const milestoneField = findMilestoneFields(attribute);

      if (projectField) {
        const filter = sequelize.models.projectFieldEntry.createSearch(projectField, options);
        groupedSearch.projectField.push(filter);
      } else if (milestoneField) {
        const filter = sequelize.models.milestoneFieldEntry.createSearch(milestoneField, options);
        groupedSearch.milestoneField.push(filter);
      }
    }
  }

  return groupedSearch;
};

const transformForView = model => {
  return Object.keys(model.rawAttributes)
    .map(attributeKey => Object.assign({}, model.rawAttributes[attributeKey], { value: model[attributeKey] }))
    .reduce((_map, attribute) => {
      _map.set(attribute.fieldName, {
        id: attribute.fieldName,
        name: attribute.displayName,
        value: attribute.value,
        type: attribute.type.constructor.name.toLowerCase()
      });
      return _map;
    }, new Map());
};

const parseFieldEntryValue = (value, type) => {
  if(type) {
    switch(type) {
    case 'boolean':
      value = truthy.includes(value.toLowerCase());
      break;
    case 'integer':
      value = parseInt(value);
      break;
    case 'float':
      value = parseFloat(value);
      break;
    case 'date':
      value = moment(value, 'YYYY-MM-DD').format('DD/MM/YYYY');
      break;
    }
  }
  return value;
};

const createFilterOptions = (attribute, options) => {
  if (attribute.includes('date')) {
    const dates = Object.keys(options).reduce((dates, key) => {
      dates[key] = moment(options[key], 'DD-MM-YYYY').format('YYYY-MM-DD');
      return dates;
    }, {});

    if(dates.from && dates.to) {
      return { [Op.between]: [ dates.from, dates.to ] };
    }

    if(dates.from) {
      return { [Op.gte]: dates.from };
    }

    if(dates.to) {
      return { [Op.lte]: dates.to };
    }
  }

  if (Array.isArray(options)) {
    return { [Op.or]: options };
  }

  return options;
};

module.exports = {
  transformForView,
  parseFieldEntryValue,
  createFilterOptions,
  groupSearchItems
};
