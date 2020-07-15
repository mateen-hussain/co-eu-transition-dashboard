const { sinon, expect } = require('test/unit/util/chai');
const config = require('config');
const proxyquire = require('proxyquire');
const nodeFetch = sinon.stub();
const tableau = proxyquire('services/tableau', {
  'node-fetch': nodeFetch
});

const someSecret = 'some-secret';

describe('services/sequelize', () => {
  it('should create a trusted url to iframe in tableau view', async () => {
    nodeFetch.resolves(someSecret);

    const workbookName = 'some-workbook';
    const viewName = 'some-view';
    const user = { email: 'email@email.com' };
    const url = await tableau.getTableauUrl(user, workbookName, viewName);

    sinon.assert.calledWith(nodeFetch, `${config.services.tableau.url}/trusted`, {
      method: 'POST',
      body: {
        username: user.email
      }
    });

    expect(url).to.eql(`http://${config.services.tableau.url}/trusted/${someSecret}/views/${workbookName}/${viewName}`);
  });

  it('throws error if no secret returned', async () => {
    const user = { email: 'email@email.com' };

    const error = new Error('some error');
    nodeFetch.rejects(error);

    let message = '';
    try{
      await tableau.getTableauUrl(user);
    } catch (thrownError) {
      message = thrownError.message;
    }
    expect(message).to.eql(error.message);
  });
});
