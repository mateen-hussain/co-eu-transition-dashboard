const { removeNulls } = require('./utils');
const get = require('lodash/get');

const parseString = (value = '') => {
  value = String(value).trim();

  if (value.length === 0) {
    return;
  }

  return value;
};

const parseGroupItem = (value, options = []) => {
  value = parseString(value);

  const matchedOption = options.find(option => String(option).toLowerCase() === String(value).toLowerCase());

  if (matchedOption) {
    return matchedOption;
  }

  return value;
}

const parseValue = (value, definition = {}) => {
  switch(definition.type) {
  case 'string':
  case 'boolean':
  case 'integer':
  case 'float':
  case 'date':
    return parseString(value);
  case 'group':
    return parseGroupItem(value, get(definition, 'config.options'));
  }
};

const parseItems = (items, itemDefinitions) => {
  const parseItem = item => {
    const parsed = itemDefinitions.reduce((parsedItem, itemDefinition) => {
      const value = item[itemDefinition.importColumnName || itemDefinition.displayName];
      parsedItem[itemDefinition.name] = parseValue(value, itemDefinition);
      return parsedItem;
    }, {});

    return removeNulls(parsed);
  };

  return items.map(parseItem);
};

module.exports = {
  parseString,
  parseValue,
  parseItems,
  parseGroupItem
};