const utils = require('helpers/utils');
const { expect } = require('test/unit/util/chai');

describe('helpers/utils', () => {
  describe('#removeNulls', () => {
    it('should remove empty items from arrays', () => {
      const test = [1,'',undefined,[1, '', undefined]];
      expect(utils.removeNulls(test)).to.eql([1,[1]]);
    });

    it('should remove empty items from objects', () => {
      const test = { a: 'a', b: undefined, c: null, d: '', e: { a: 1, b: '' } };
      expect(utils.removeNulls(test)).to.eql({ a: 'a', e: { a: 1 } });
    });

    it('should remove empty items from mixed types', () => {
      const test = [
        {
          a: 'a',
          b: undefined,
          c: null,
          d: '',
          e: ['a', '']
        }, {
          a: undefined,
          b: [1,'', undefined]
        }
      ];

      expect(utils.removeNulls(test)).to.eql([{ a: 'a', e: ['a'] }, { b: [1] }]);
    });
  });
});