const { sinon, expect } = require('test/unit/util/chai');
const config = require('config');
const proxyquire = require('proxyquire');
const requestPromise = sinon.stub();
const tableau = proxyquire('services/tableau', {
  'request-promise-native': requestPromise
});

const someSecret = 'some-secret';

describe('services/sequelize', () => {
  let oldUrl;

  before(() => {
    oldUrl = config.services.tableau.url;
  });

  after(() => {
    config.services.tableau.url = oldUrl;
  });

  it('throws error if no url set in config', async () => {
    let message = '';
    try{
      await tableau.getTableauUrl();
    } catch (thrownError) {
      message = thrownError.message;
    }
    expect(message).to.eql('No tableau url set');
  });

  it('throws error if response from tableau is -1', async () => {
    config.services.tableau.url = 'some url';
    const user = { email: 'email@email.com' };

    const error = new Error('error accessing tableau');
    requestPromise.resolves("-1");

    let message = '';
    try{
      await tableau.getTableauUrl(user);
    } catch (thrownError) {
      message = thrownError.message;
    }
    expect(message).to.eql(error.message);
  });

  it('should create a trusted url to iframe in tableau view', async () => {
    config.services.tableau.url = 'some url';
    requestPromise.resolves(someSecret);

    const workbookName = 'some-workbook';
    const viewName = 'some-view';
    const user = { email: 'email@email.com' };
    const url = await tableau.getTableauUrl(user, workbookName, viewName);

    sinon.assert.calledWith(requestPromise, {
      method: 'POST',
      uri: `${config.services.tableau.url}/trusted`,
      form: { username: user.email }
    });

    expect(url).to.eql(`http://${config.services.tableau.url}/trusted/${someSecret}/views/${workbookName}/${viewName}`);
  });

  it('throws error if no secret returned', async () => {
    config.services.tableau.url = 'some url';
    const user = { email: 'email@email.com' };

    const error = new Error('some error');
    requestPromise.rejects(error);

    let message = '';
    try{
      await tableau.getTableauUrl(user);
    } catch (thrownError) {
      message = thrownError.message;
    }
    expect(message).to.eql(error.message);
  });
});
