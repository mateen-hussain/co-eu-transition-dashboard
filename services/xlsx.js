const xlsx = require('node-xlsx');

const parse = buffer => {
  const sheets = xlsx.parse(buffer);

  return sheets.map(sheet => {
    return sheet.data.reduce((data, row, rowIndex) => {
      const isHeaderRow = rowIndex === 0;
      const rowHasData = row[0] && row[0].trim().length;

      if (isHeaderRow || !rowHasData) {
        return data;
      }

      const object = row.reduce((object, item, index) => {
        object[sheet.data[0][index]] = item;
        return object;
      }, {});

      data.push(object);

      return data;
    }, []);
  });
};

module.exports = { parse };

