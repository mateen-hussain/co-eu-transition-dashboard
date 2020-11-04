const { expect, sinon } = require('test/unit/util/chai');
const proxyquire = require('proxyquire');
const config = require('config');
const uuid = require('uuid');

let notify = {};

describe('services/notify', ()=>{
  let sendEmailStub = sinon.stub();
  const prevKey = config.notify.apiKey;

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
    config.notify.apiKey = 'some-key';
  });

  after(() => {
    config.notify.apiKey = prevKey;
  });


  describe('#sendEmailWithTempPassword', () => {
    const email = 'some@email.com';
    const userId = "123";
    const password = 'some password';
    beforeEach(() => {
      sendEmailStub.reset();       
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

  describe('#sendMeasuresUpdatedTodayEmail', ()=>{
    const emails = ['1@email.com' , '2@email.com'];
    const measures = ['m1', 'm2'];
    beforeEach(() => {
      sendEmailStub.reset();       
      sinon.stub(uuid, 'v4').returns('someId')
    });
    
    it('sends emails to everyone successfully', async() => {
      sendEmailStub.onFirstCall().resolves();
      sendEmailStub.onSecondCall().resolves();

      await notify.sendMeasuresUpdatedTodayEmail({ emails, measures });
      sinon.assert.callCount(sendEmailStub, 2);
    });

    it('continue sending emails to others when one of them fails', async() => {
      sendEmailStub.onFirstCall().rejects();
      sendEmailStub.onSecondCall().resolves();

      await notify.sendMeasuresUpdatedTodayEmail({ emails, measures });
      sinon.assert.callCount(sendEmailStub, 2);
    });
  })
});