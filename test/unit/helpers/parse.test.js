const parse = require('helpers/parse');
const { expect } = require('test/unit/util/chai');

describe('helpers/parse', () => {
  describe('#parseString', () => {
    it('parses string', () => {
      expect(parse.parseString(' some string ')).to.eql('some string');
    });

    it('returns undefined if value starts with n/a', () => {
      expect(parse.parseString('N/A - some reason')).to.eql(undefined);
    });
  });

  describe('#parseDateExcel', () => {
    it('parses an excel date format', () => {
      expect(parse.parseDateExcel('65465')).to.eql(3447014400000);
    });

    it('returns null if invalid date', () => {
      expect(parse.parseDateExcel('abc')).to.eql(null);
    });
  });

  describe('#parseDate', () => {
    it('returns undefined if value starts with n/a', () => {
      expect(parse.parseDate('N/A - some reason')).to.eql(undefined);
    });

    it('returns date if date is a excel date', () => {
      expect(parse.parseDate('65465')).to.eql(3447014400000);
    });

    it('returns parsed other conditions are not met', () => {
      expect(parse.parseDate('some value')).to.eql('some value');
    });
  });

  describe('#parseValue', () => {
    const shouldParseString = ['string','boolean','group','integer','float'];

    shouldParseString.forEach((type) => {
      it(`should parse string for type ${type}`, () => {
        expect(parse.parseValue('somestring', { type })).to.eql('somestring');
      });
    });

    it(`should parse date for type date`, () => {
      expect(parse.parseValue('65465', { type: 'date' })).to.eql(3447014400000);
    });
  });

  describe('#parseItems', () => {
    const itemDefinitions = [{
      name: 'name',
      importColumnName: 'some_name',
      type: 'string'
    },{
      name: 'date',
      importColumnName: 'some_date',
      type: 'date'
    }];

    const items = [
      {
        some_date: 65465,
        some_name: 'some name'
      },
      {
        some_date: 55465,
        some_name: 'some name 2'
      }
    ];

    it(`should parse date for type date`, () => {
      const response = parse.parseItems(items, itemDefinitions);
      expect(response).to.eql([{ name: 'some name', date: 3447014400000 }, { name: 'some name 2', date: 2583014400000 }]);
    });
  });
});