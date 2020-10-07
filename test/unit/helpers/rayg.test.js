const { expect } = require('test/unit/util/chai');
const { getRaygColour } = require('helpers/rayg');

describe('#getRaygColour', () => {
  const entity = {
    redThreshold: 1,
    aYThreshold: 2,
    greenThreshold: 3,
    value: 3,
  };

  it('gets rayg for entity', () => {
    const colour = getRaygColour(entity);
    expect(colour).to.eql('green');
  });
});
