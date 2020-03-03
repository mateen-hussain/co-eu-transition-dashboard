const database = require('services/database');
const { expect, sinon } = require('test/unit/util/chai');

describe('services/database', () => {
  beforeEach(() => {
    database.connection.query = sinon.stub()
  });

  describe('#executeQuery', () => {
    it('executes a query', () => {
      const result = { test: 'result' };
      database.connection.query.callsArgWith(1, null, result);
      return expect(database.executeQuery()).to.eventually.eql(result);
    });
  });

  describe('#getProjects', () => {
    it('gets projects', () => {
      const result = { test: 'result' };
      database.connection.query.callsArgWith(1, null, result);
      return expect(database.getProjects()).to.eventually.eql(result);
    });
  });

  describe('#getFilters', () => {
    it('gets filters', async () => {
      const result = [{ name: 'some department', count: 22 }];
      database.connection.query.callsArgWith(1, null, []);

      database.connection.query
        .withArgs(`SELECT department as value, COUNT(department) as count FROM projects GROUP BY department`)
        .callsArgWith(1, null, result);

      const filters = await database.getFilters();

      return expect(filters).to.eql([{
        name: "department",
        options: [
          {
            count: 22,
            name: "some department"
          }
        ]
      }]);
    });
  });
});
