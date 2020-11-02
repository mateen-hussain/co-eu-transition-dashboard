const measures = require('helpers/measures.js');
const sequelize = require("sequelize");
const Op = sequelize.Op;

const getMeasuresUpdatedToday = async() => {
  const measureCategory = await measures.getCategory('Measure');
  const themeCategory = await measures.getCategory('Theme');
  const measureEntities = await measures.getMeasureEntities({
    measureCategory, 
    themeCategory,
    where: { updated_at: {
      [Op.gte]: sequelize.fn('CURDATE')
    } }
  });
  return measureEntities
}

module.exports = {
  getMeasuresUpdatedToday 
}
