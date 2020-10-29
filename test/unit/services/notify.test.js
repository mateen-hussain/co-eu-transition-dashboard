const { expect, sinon } = require('test/unit/util/chai');
const proxyquire = require('proxyquire');
const config = require('config');

let notify = {};

describe('services/notify', ()=>{
  let sendEmailStub = sinon.stub();

  const notificationsNodeClientStub = {
    NotifyClient: function() {
      return {
        sendEmail: sendEmailStub
      };
    }
  };

  beforeEach(()=>{
    const NotifyClient = proxyquire('services/notify', {
      'notifications-node-client': notificationsNodeClientStub,
    });
    notify = NotifyClient;        
  });


  describe('#sendEmailWithTempPassword', () => {
    const prevKey = config.notify.apiKey;
    const email = 'some@email.com';
    const userId = "123";
    const password = 'some password';
    beforeEach(() => {
      config.notify.apiKey = 'some-key';
    });
        
    after(() => {
      config.notify.apiKey = prevKey;
    });
        
    it('sends email successfully', async() => {
      sendEmailStub.resolves();

      await notify.sendEmailWithTempPassword({ email, userId, password });
      sinon.assert.calledWith(sendEmailStub,
        config.notify.createTemplateKey,
        email,
        {
          personalisation: {
            password,
            email,
            link: config.serviceUrl,
            privacy_link: config.serviceUrl + "privacy-notice"
          },
          reference: userId
        },
      );
    });
        
    it('throws error sending email', async() => {
      try{
        sendEmailStub.throws();
        await notify.sendEmailWithTempPassword({ email, userId, password });
      } catch(err) {
        expect(err.message).to.equal('ERROR_SENDING_EMAIL');
      }
    });
  });

});