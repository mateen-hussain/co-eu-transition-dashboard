const models = require('helpers/models');
const { expect, sinon } = require('test/unit/util/chai');
const { Op } = require('sequelize');

describe('helpers/models', () => {
  describe('#transformForView', () => {
    it('returns model attributes for frontend view', () => {
      const model = {
        fname: 'first_name',
        lname: 'last_name',
        rawAttributes: {
          fname: {
            fieldName: 'fname',
            displayName: 'First Name',
            type: 'string'
          },
          lname: {
            fieldName: 'lname',
            displayName: 'Last Name',
            type: 'string'
          }
        }
      };

      const forView = models.transformForView(model);

      expect(forView.get('fname')).to.eql({ id:"fname", name:"First Name", type: 'string', value: "first_name" });
      expect(forView.get('lname')).to.eql({ id:"lname", name:"Last Name", type: 'string', value: "last_name" });
    })
  });

  describe('#validateFieldEntryValue', () => {
    let scope = {};
    beforeEach(() => {
      scope.projectField = {
        type: ''
      };
    });

    const tests = [{
      type: 'boolean',
      valids: [true, 'true', 'yes', 1, '1', 'y', false, 'false', 'no', 0, '0', 'n'],
      invalids: ['some string', 1234]
    },{
      type: 'integer',
      valids: [1, 100, '100', '123123.00'],
      invalids: ['not integer']
    },{
      type: 'float',
      valids: [1.24, '1.24'],
      invalids: ['not float']
    },{
      type: 'date',
      valids: ['2020-02-20'],
      invalids: ['not date', '2020-02-50']
    },{
      type: 'group',
      valids: ['foo', 'bar'],
      invalids: ['baz'],
      config: {
        options: ['foo', 'bar']
      }
    }];

    tests.forEach(test => {
      describe(`validates ${test.type}`, () => {
        beforeEach(() => {
          scope.projectField.type = test.type;
          if(test.config) {
            scope.projectField.config = test.config;
          }
        });

        test.valids.forEach(valid => {
          it(`accepts ${valid}`, () => {
            scope.projectField.type = test.type;
            expect(models.validateFieldEntryValue.call(scope, valid)).to.be.ok;
          });
        });

        test.invalids.forEach(invalid => {

          it(`rejects ${invalid}`, () => {
            expect(() => models.validateFieldEntryValue.call(scope, invalid)).to.throw();
          });
        });
      });
    });
  });

  describe('#parseFieldEntryValue', () => {
    it('parses a true boolean value', () => {
      const type = 'boolean';
      const value = '1';

      const parsedValue = models.parseFieldEntryValue(value, type);

      expect(parsedValue).to.be.true;
    });

    it('parses a false boolean value', () => {
      const type = 'boolean';
      const value = '0';

      const parsedValue = models.parseFieldEntryValue(value, type);

      expect(parsedValue).to.be.false;
    });

    it('parses a integer value', () => {
      const type = 'integer';
      const value = '24';

      const parsedValue = models.parseFieldEntryValue(value, type);

      expect(parsedValue).to.eql(24);
    });

    it('parses a float value', () => {
      const type = 'float';
      const value = '24.5';

      const parsedValue = models.parseFieldEntryValue(value, type);

      expect(parsedValue).to.eql(24.5);
    });

    it('doesnt change value if no type provided', () => {
      const value = '24.5';

      const parsedValue = models.parseFieldEntryValue(value);

      expect(parsedValue).to.eql(value);
    });
  });

  describe('#createFilterOptions', () => {
    it('returns a filter option for none dates', () => {
      const attribute = { includes: sinon.stub().returns(false) };
      const options = ['test1'];
      const filter = models.createFilterOptions(attribute, options);
      expect(filter).to.eql({ [Op.or]: options });
    });

    it('returns a filter option for dates', () => {
      const attribute = { includes: sinon.stub().returns(true) };
      const options = ['01-01-2020', '01-01-2021'];
      const filter = models.createFilterOptions(attribute, options);
      expect(filter).to.eql({ [Op.between]: ['2020-01-01', '2021-01-01'] });
    });
  });
});