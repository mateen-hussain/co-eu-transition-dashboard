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
    const url = await tableau.getTableauUrl(workbookName, viewName);

    sinon.assert.calledWith(nodeFetch, `${config.services.tableau.url}/trusted`, {
      method: 'POST',
      body: {
        username: config.services.tableau.username
      }
    });

    expect(url).to.eql(`http://${config.services.tableau.url}/trusted/${someSecret}/views/${workbookName}/${viewName}`);
  });

  it('throws error if no secret returned', async () => {
    const error = new Error('some error');
    nodeFetch.rejects(error);

    let message = '';
    try{
      await tableau.getTableauUrl();
    } catch (thrownError) {
      message = thrownError.message;
    }
    expect(message).to.eql(error.message);
  });
});
