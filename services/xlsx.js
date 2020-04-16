const xlsx = require('xlsx');

const headerRowIdentifer = ['UID', 'Project UID'];

const subHeaderRowIdentifers = [
  'Project UID',
  '[Set by CO]',
  'The UID of the project these milestones cover'
];

const getFirstHeaderCell = sheet => {
  // get all cell references
  const cellReferences = Object.keys(sheet)
    // remove meta data ( meta starts with ! ) so we are just left with cell data
    .filter(ref => ref.indexOf('!') === -1);

  const firstCellWithData = cellReferences.find(cellReference => {
    const cellValue = sheet[cellReference].v;
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

const parse = buffer => {
  const excelDocument = xlsx.read(buffer, { cellDates: true });

  return Object.keys(excelDocument.Sheets).map(name => {
    const sheet = excelDocument.Sheets[name];
    const range = getRange(sheet);

    const data = xlsx.utils.sheet_to_json(sheet, {
      raw: true,
      defval: '',
      range,
      blankrows: false
    });

    return {
      name,
      data: removeSubHeaderRows(data)
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