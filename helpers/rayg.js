/* eslint-disable no-prototype-builtins */

const getRaygColour = entity => {
  let colour;
  if(entity.hasOwnProperty('redThreshold') &&
    entity.hasOwnProperty('aYThreshold') &&
    entity.hasOwnProperty('greenThreshold') &&
    entity.hasOwnProperty('value')) {
    if (parseInt(entity.value) >= parseInt(entity.greenThreshold)) {
      colour = "green";
    } else if (parseInt(entity.value) > parseInt(entity.aYThreshold)) {
      colour = "yellow";
    } else if (parseInt(entity.value) > parseInt(entity.redThreshold)) {
      colour = "amber";
    } else {
      colour = "red";
    }
  }

  return colour;
}

module.exports = {
  getRaygColour
};