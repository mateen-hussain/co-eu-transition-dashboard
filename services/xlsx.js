const xlsx = require('xlsx');
const { expectedSheets } = require('helpers/validation');

const headerRowIdentifer = ['UID', 'Project UID'];

const subHeaderRowIdentifers = [
  'Project UID',
  '[Set by CO]',
  '[Free text]',
  '[Drop down]',
  'The UID of the project these milestones cover'
];

const getFirstHeaderCell = sheet => {
  // get all cell references
  const cellReferences = Object.keys(sheet)
    // remove meta data ( meta starts with ! ) so we are just left with cell data
    .filter(ref => ref.indexOf('!') === -1);

  const firstCellWithData = cellReferences.find(cellReference => {
    const cellValue = String(sheet[cellReference].v).trim();
    return headerRowIdentifer.includes(cellValue);
  });

  if(!firstCellWithData) {
    throw new Error('Unable to find header row, check the excel document against the template');
  }

  return firstCellWithData;
};

const getLastCellWithData = sheet => {
  const firstAndLastCellInSheet = sheet['!ref'].split(':');
  return firstAndLastCellInSheet[1];
};

const removeSubHeaderRows = data => {
  const valueIsInSubHeaderRow = (value = '') => {
    return subHeaderRowIdentifers
      .find(subHeaderRowIdentifer => String(value).indexOf(subHeaderRowIdentifer) !== -1);
  };

  const removeItemsFlaggedAsSubheader = item => {
    const shouldRemove = Object.values(item)
      .find(valueIsInSubHeaderRow);

    if (shouldRemove) {
      return false;
    } else {
      return true;
    }
  };

  return data.filter(removeItemsFlaggedAsSubheader);
}

// gets cell reference from first header cell to last cell in sheet
const getRange = sheet => {
  const firstCellWithData = getFirstHeaderCell(sheet);
  const lastCellWithData = getLastCellWithData(sheet);

  return `${firstCellWithData}:${lastCellWithData}`;
};

const removeEmptyKeyValuePairs = data => {
  return data.map(d => {
    Object.keys(d).forEach(columnName => {
      if(columnName.includes('__EMPTY')) {
        delete d[columnName];
      }
    });
    return d;
  });
};

const cleanData = data => {
  data = removeSubHeaderRows(data);
  data = removeEmptyKeyValuePairs(data);
  return data;
};

const parse = buffer => {
  const excelDocument = xlsx.read(buffer, { cellDates: true });

  return Object.keys(excelDocument.Sheets)
    .filter(sheetName => Object.keys(expectedSheets).includes(sheetName))
    .map(name => {
      const sheet = excelDocument.Sheets[name];
      const range = getRange(sheet);

      let data = xlsx.utils.sheet_to_json(sheet, {
        raw: true,
        defval: '',
        range,
        blankrows: false
      });

      return {
        name,
        data: cleanData(data)
      };
    });
};

module.exports = {
  parse,
  getRange,
  removeSubHeaderRows,
  getFirstHeaderCell,
  getLastCellWithData
};