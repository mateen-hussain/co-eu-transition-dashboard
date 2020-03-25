const { Op } = require('sequelize');
const moment = require('moment');
const sequelize = require('services/sequelize');

const groupSearchItems = async (search, overrides = {}) => {
  const groupedSearch = { project: {}, milestone: {}, projectField: [], milestoneField: {} };
  const projectFields = await sequelize.models.projectField.findAll();
  const findProjectFields = attribute => {
    return projectFields.find(projectField => projectField.name === attribute);
  };

  for (const attribute of Object.keys(search || {})) {
    const options = search[attribute];

    if(sequelize.models.project.includes(attribute)) {
      groupedSearch.project[attribute] = sequelize.models.project.createSearch(attribute, options, overrides.Project);
    } else if(sequelize.models.milestone.includes(attribute)) {
      groupedSearch.milestone[attribute] = sequelize.models.milestone.createSearch(attribute, options, overrides.Milestone);
    } else {
      const projectField = findProjectFields(attribute);
      if( projectField ) {
        const filter = sequelize.models.projectFieldEntry.createSearch(projectField, options);
        groupedSearch.projectField.push(filter);
      }

    }
  }

  return groupedSearch;
};

const transformForView = model => {
  return Object.keys(model.rawAttributes)
    .map(attributeKey => Object.assign({}, model.rawAttributes[attributeKey], { value: model[attributeKey] }))
    .filter(attribute => attribute.displayName)
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

const truthy = [true, 'true', 'yes', 1, '1', 'y'];
const falsey = [false, 'false', 'no', 0, '0', 'n'];

const isBool = value => [...truthy, ...falsey].includes(value);

const validateFieldEntryValue = function(val = '') {
  if(!this.projectField) return true;

  const value = String(val).trim();

  switch(this.projectField.type) {
    case 'boolean':
      if (!isBool(value.toLowerCase())) {
        throw Error(`"${value}" is not a valid boolean`);
      }
      break;
    case 'integer':
    case 'float':
      if(isNaN(value)) {
        throw Error(`"${value}" is not a valid number`);
      }
      break;
    case 'date':
      if(!moment(value, 'YYYY-MM-DD').isValid()) {
        throw Error(`"${value}" is not a valid date`);
      }
      break;
    case 'group':
      if(!this.projectField.config.options.includes(value)) {
        throw Error(`"${value}" must match one of the following: ${this.projectField.config.options.join(', ')}`);
      }
      break;
  }

  return true;
};

const parseFieldEntryValue = (value, type, forDatabase = false) => {
  if(type) {
    switch(type) {
      case 'boolean':
        value = truthy.includes(value);
        break;
      case 'integer':
        value = parseInt(value);
        break;
      case 'float':
        value = parseFloat(value);
        break;
      case 'date':
        if( forDatabase ) {
          const date = moment(value, 'DD/MM/YYYY');
          if(date.isValid()) {
            value = date.format('YYYY-MM-DD');
          } else {
            value = moment(value).format('YYYY-MM-DD');
          }

        } else {
          value = moment(value, 'YYYY-MM-DD').format('DD/MM/YYYY');
        }
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
  validateFieldEntryValue,
  createFilterOptions,
  groupSearchItems
};
