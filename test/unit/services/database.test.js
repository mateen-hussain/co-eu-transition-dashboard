const database = require('services/database');
const { expect, sinon } = require('test/unit/util/chai');

describe.skip('services/database', () => {
  beforeEach(() => {
    // sinon.stub(database, 'getProjects').resolves(projectsSample);
  });

  afterEach(() => {
    // database.getProjects.restore();
  });
});
