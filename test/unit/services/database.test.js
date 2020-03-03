const { expect, sinon } = require('test/unit/util/chai');
const proxyquire = require('proxyquire').noPreserveCache();

let mysqlStub = {};
let connectStub = {};
let createConnectionStub = {};

describe('services/database', () => {
  beforeEach(() => {
    createConnectionStub = sinon.stub();
    connectStub = sinon.stub().callsArgWith(0);
    mysqlStub = {
      createConnection: createConnectionStub.returns({
        connect: connectStub
      })
    };
  });

  it('connects without error', () => {
    proxyquire('services/database', {
      'mysql': mysqlStub
    });

    expect(createConnectionStub.calledOnce).to.eql(true);
    expect(connectStub.calledOnce).to.eql(true);
  });

  it('throws error', () => {
    const error = new Error('some error');
    connectStub.callsArgWith(0, error);

    const loggerStub = {
      error: sinon.stub()
    };

    proxyquire('services/database', {
      'mysql': mysqlStub,
      'services/logger': loggerStub
    });

    expect(createConnectionStub.calledOnce).to.eql(true);
    expect(connectStub.calledOnce).to.eql(true);
    expect(loggerStub.error.calledOnce).to.eql(true);

    sinon.assert.calledWith(loggerStub.error, error);
  });
});
