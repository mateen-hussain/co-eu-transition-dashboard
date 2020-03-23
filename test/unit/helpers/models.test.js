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

      expect(forView).to.eql([{ id:"fname", name:"First Name", type: 'string', value: "first_name" }, { id:"lname", name:"Last Name", type: 'string', value: "last_name" }]);
    })
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