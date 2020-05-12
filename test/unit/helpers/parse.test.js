const parse = require('helpers/parse');
const { expect } = require('test/unit/util/chai');

describe('helpers/parse', () => {
  describe('#parseString', () => {
    it('parses string', () => {
      expect(parse.parseString(' some string ', {})).to.eql('some string');
    });

    it('returns undefined if value starts with n/a', () => {
      expect(parse.parseString('N/A - some reason', { isRequried: true })).to.eql(undefined);
    });
  });

  describe('#parseValue', () => {
    const shouldParseString = ['string','boolean','integer','float','date'];

    shouldParseString.forEach((type) => {
      it(`should parse string for type ${type}`, () => {
        expect(parse.parseValue('somestring', { type })).to.eql('somestring');
      });
    });

    it('should return correct group case as per the options in the database', () => {
      const definition = {
        type: 'group',
        config: {
          options: ['Some Option']
        }
      };

      const value = 'some option';

      expect(parse.parseValue(value, definition)).to.eql('Some Option');
    })
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
        some_date: '20/10/2020',
        some_name: 'some name'
      },
      {
        some_date: '22/10/2020',
        some_name: 'some name 2'
      }
    ];

    it(`should parse items correctly`, () => {
      const response = parse.parseItems(items, itemDefinitions);
      expect(response).to.eql([{ name: 'some name', date: '20/10/2020' }, { name: 'some name 2', date: '22/10/2020' }]);
    });
  });
});