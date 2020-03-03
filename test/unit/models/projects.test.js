const projects = require('models/projects');
const database = require('services/database');
const { expect } = require('test/unit/util/chai');

describe('models/projects', () => {
  beforeEach(() => {
    database.connection.query.callsArgWith(1, null, {});
  });

  afterEach(() => {
    database.connection.query.callsArgWith(1, null, {});
  });

  describe('#executeQuery', () => {
    it('executes a query', () => {
      const result = { test: 'result' };
      database.connection.query.callsArgWith(1, null, result);
      return expect(projects.executeQuery()).to.eventually.eql(result);
    });
  });

  describe('#getProjects', () => {
    it('gets projects', () => {
      const result = { test: 'result' };
      const filters = { filter: ['opt1', 'opt2' ]};
      database.connection.query.callsArgWith(1, null, result);
      return expect(projects.getProjects(filters)).to.eventually.eql(result);
    });
  });

  describe('#getFilters', () => {
    it('gets filters', async () => {
      const result = [{ name: 'some department', count: 22 }];
      database.connection.query.callsArgWith(1, null, result);

      const filters = await projects.getFilters();

      return expect(filters).to.eql([
        {
          name: "department",
          options: [
            {
              count: 22,
              name: "some department"
            }
          ]
        },
        {
          "name": "project_name",
          "options": [
            {
              "count": 22,
              "name": "some department"
            }
          ]
        },
        {
          "name": "impact",
          "options": [
            {
              "count": 22,
              "name": "some department"
            }
          ]
        },
        {
          "name": "hmg_confidence",
          "options": [
            {
              "count": 22,
              "name": "some department"
            }
          ]
        },
        {
          "name": "citizen_readiness",
          "options": [
            {
              "count": 22,
              "name": "some department"
            }
          ]
        },
        {
          "name": "business_readiness",
          "options": [
            {
              "count": 22,
              "name": "some department"
            }
          ]
        },
        {
          "name": "eu_state_confidence",
          "options": [
            {
              "count": 22,
              "name": "some department"
            }
          ]
        }
      ]);
    });
  });
});



