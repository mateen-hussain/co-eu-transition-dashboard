const { removeNulls } = require('./utils');

const parseString = (value = '') => {
  value = String(value).trim();

  if (value.toLowerCase().startsWith("n/a")){
    return;
  }

  return value;
};

const parseValue = (value, definition) => {
  switch(definition.type) {
  case 'string':
  case 'boolean':
  case 'group':
  case 'integer':
  case 'float':
  case 'date':
    return parseString(value);
  }
};

const parseItems = (items, itemDefinitions) => {
  const parseItem = item => {
    const parsed = itemDefinitions.reduce((parsedItem, itemDefinition) => {
      const value = item[itemDefinition.importColumnName];
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
  parseItems
};