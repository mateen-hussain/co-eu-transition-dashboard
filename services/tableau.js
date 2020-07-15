const fetch = require('node-fetch');
const config = require('config');

const getTableauUrl = async (user, workbook, view) => {
  const response = await fetch(`${config.services.tableau.url}/trusted`, {
    method: 'POST',
    body: {
      username: user.email
    }
  });

  return `http://${config.services.tableau.url}/trusted/${response}/views/${workbook}/${view}`;
};

module.exports = { getTableauUrl };