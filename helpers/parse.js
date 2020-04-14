const { removeNulls } = require('./utils');

const parseString = (value = '') => {
  value = String(value).trim();

  if (value.toLowerCase().startsWith("n/a")){
    return;
  }

  return value;
};

const parseDateExcel = (excelTimestamp) => {
  const secondsInDay = 24 * 60 * 60;
  const excelEpoch = new Date(1899, 11, 31);
  const excelEpochAsUnixTimestamp = excelEpoch.getTime();
  const missingLeapYearDay = secondsInDay * 1000;
  const delta = excelEpochAsUnixTimestamp - missingLeapYearDay;
  const excelTimestampAsUnixTimestamp = excelTimestamp * secondsInDay * 1000;
  const parsed = excelTimestampAsUnixTimestamp + delta;
  return isNaN(parsed) ? null : parsed;
};

const parseDate = (value = '') => {
  value = String(value).trim();

  if (value.toLowerCase().startsWith("n/a")){
    return;
  }

  // handle excel date
  if (value.length === 5) {
    value = parseDateExcel(value)
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
    return parseString(value);
  case 'date':
    return parseDate(value);
  }
};

const parseItems = (items, itemDefinitions) => {
  const parseItem = item => {
    const parsed = itemDefinitions.reduce((parsedItem, itemDefinition) => {
      const value = item[itemDefinition.miTemplateColumnName];
      parsedItem[itemDefinition.name] = parseValue(value, itemDefinition);
      return parsedItem;
    }, {});

    return removeNulls(parsed);
  };

  return items.map(parseItem);
};

module.exports = {
  parseString,
  parseDateExcel,
  parseDate,
  parseValue,
  parseItems
};