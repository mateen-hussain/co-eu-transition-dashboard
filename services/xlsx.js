const xlsx = require('xlsx');

const parse = buffer => {
  const workSheet = xlsx.read(buffer, { cellDates: true });

  return Object.values(workSheet.Sheets).map(sheet => {
    return xlsx.utils.sheet_to_json(sheet, { raw: true, defval: '' });
  });
};

module.exports = { parse };