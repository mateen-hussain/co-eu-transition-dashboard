const request = require('request-promise-native');
const config = require('config');

const getTableauUrl = async (user, workbook, view) => {
  if(!config.services.tableau.url) {
    if(config.env === 'development') {
      return `https://some-tableau-url.com/trusted/some-token/views/${workbook}/${view}`;
    }
    throw new Error('No tableau url set');
  }

  const token = await request({
    method: 'POST',
    uri: `${config.services.tableau.url}/trusted`,
    form: { username: user.email }
  });

  if(token == "-1") {
    throw new Error('error accessing tableau with response -1');
  }

  return `${config.services.tableau.url}/trusted/${token}/views/${workbook}/${view}`;
};

module.exports = { getTableauUrl };
