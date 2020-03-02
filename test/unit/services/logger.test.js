const logger = require('services/logger');
const { expect } = require('test/unit/util/chai');

describe('services/logger', () => {
  it('returns a logger instance', () => {
    expect(logger.constructor.name).to.eql('DerivedLogger');
  });
});
