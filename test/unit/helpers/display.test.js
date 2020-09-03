const display = require('helpers/display');
const { expect } = require('test/unit/util/chai');

describe('helpers/utils', () => {
  describe('#transformDeliveryConfidenceValue', () => {
    it('should transform the digit to text', () => {
      expect(display.transformDeliveryConfidenceValue(1)).to.eql('1 - Low confidence');
    });

    it('should return no level given if digit is out of range', () => {
      expect(display.transformDeliveryConfidenceValue(10)).to.eql('No level given');
    });
  });
});