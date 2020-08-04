const validation = require('helpers/validation');
const { expect } = require('test/unit/util/chai');

describe('helpers/validation', () => {
  describe('#validateValue', () => {
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
      valids: ['foo', 'bar', '0'],
      invalids: ['baz'],
      config: {
        options: ['foo', 'bar', '0']
      }
    }];

    tests.forEach(test => {
      describe(`validates ${test.type}`, () => {
        test.valids.forEach(value => {
          it(`accepts ${value}`, () => {
            expect(() => validation.validateValue(value, test)).to.not.throw();
          });
        });

        test.invalids.forEach(value => {
          it(`rejects ${value}`, () => {
            const theTest = () => validation.validateValue(value, test);
            expect(theTest).to.throw();
          });
        });
      });
    });
  });

  describe('#validateItems', () => {
    const itemDefinitions = [{
      name: 'name',
      type: 'string'
    },{
      name: 'number',
      type: 'integer'
    },{
      name: 'date',
      type: 'date'
    }];

    it('should validate a collection of items and not return any errors', () => {
      const items = [
        {
          some_date: 65465,
          some_name: 'some name'
        },
        {
          some_date: 55465,
          some_name: 'some name 2',
          number: 123
        }
      ];

      expect(validation.validateItems(items, itemDefinitions)).to.eql([]);
    });

    it('should validate a collection of items and return any errors that occour', () => {
      const items = [
        {
          some_date: 65465,
          some_name: 'some name'
        },
        {
          some_date: 55465,
          some_name: 'some name 2',
          number: 'should throw'
        }
      ];

      expect(validation.validateItems(items, itemDefinitions)).to.eql([
        {
          "error": "Is not a valid number",
          "item": {
            "number": "should throw",
            "some_date": 55465,
            "some_name": "some name 2"
          },
          "itemDefinition": {
            "name": "number",
            "type": "integer"
          },
          "value": "should throw"
        }
      ]);
    });
  });

  describe('#validateColumns', () => {
    const requiredColumns = ['col1', 'col2', 'col3'];
    it('should not return any errors if columns are valid', () => {
      const columnsRecieved = ['col1', 'col2', 'col3'];
      expect(validation.validateColumns(columnsRecieved, requiredColumns, requiredColumns)).to.eql([]);
    });

    it('should return errors if a coloumn is missing', () => {
      const columnsRecieved = ['col1', 'col2'];
      expect(validation.validateColumns(columnsRecieved, requiredColumns, requiredColumns)).to.eql([{ error: '"col3" column is missing from the spreadsheet.' }]);
    });

    it('should return errors if an extra coloumn is present', () => {
      const columnsRecieved = ['col1', 'col2', 'col3', 'col4'];
      expect(validation.validateColumns(columnsRecieved, requiredColumns, requiredColumns)).to.eql([{ error: '"col4" column is not recognised as a valid column, please either remove or rename.' }]);
    });

    it('should not return errors if col4 is allowed', () => {
      const columnsRecieved = ['col1', 'col2', 'col3', 'col4'];
      const allowedColumns = ['col1', 'col2', 'col3', 'col4'];
      expect(validation.validateColumns(columnsRecieved, requiredColumns, allowedColumns)).to.eql([]);
    });
  });

  describe('#validateSheetNames', () => {
    it('return error if "TAB A - Baseline data" sheet not found in document', () => {
      const sheets = [{
        name: 'TAB B - Milestones data',
        data: []
      }];
      const data = validation.validateSheetNames(sheets);
      expect(data.errors[0].error).to.eql('"TAB A - Baseline data" sheet was not found in the excel document uploaded')
    });

    it('return error if "TAB B - Milestones data" sheet not found in document', () => {
      const sheets = [{
        name: 'TAB A - Baseline data',
        data: []
      }];
      const data = validation.validateSheetNames(sheets);
      expect(data.errors[0].error).to.eql('"TAB B - Milestones data" sheet was not found in the excel document uploaded')
    });

    it('should return projects and milestones', () => {
      const sheets = [{
        name: 'TAB A - Baseline data',
        data: []
      },{
        name: 'TAB B - Milestones data',
        data: []
      }];
      const data = validation.validateSheetNames(sheets);
      expect(data.projects).to.eql([]);
      expect(data.milestones).to.eql([]);
    });
  });
});