const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const flash = require('middleware/flash');
const config = require('config');
const proxyquire = require('proxyquire');


let page = {};

let sendEmailStub = sinon.stub();

const notificationsNodeClientStub = {
  NotifyClient: function() {
    return {
      sendEmail: sendEmailStub
    };
  }
};

describe('pages/admin/user-management/create-user/CreateUser', ()=>{
  beforeEach(()=>{
    const CreateUser = proxyquire('pages/admin/user-management/create-user/Createuser', {
      'notifications-node-client': notificationsNodeClientStub,
    });
    const res = { cookies: sinon.stub(), redirect: sinon.stub() };
    const req = { cookies: [], params: {}, flash: sinon.stub(), originalUrl: 'some-url' };
    page = new CreateUser('some path', req, res);
    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    authentication.protect.restore();
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.admin.createUser);
    });
  });
    
  describe('#pathToBind', () => {
    it('returns correct url', () => {
      expect(page.pathToBind).to.eql(`${paths.admin.createUser}/:success(success)?`);
    });
  });

  describe('#middleware', () => {
    it('only admins are aloud to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['admin']),
        flash
      ]);
    
      sinon.assert.calledWith(authentication.protect, ['admin']);
    });
  });

  describe('#successMode', () => {
    it('returns success is undefined when success param not set', () => {
      expect(page.successMode).to.be.undefined;
    });

    it('returns success is true when success param not set', () => {
      page.req.params = { success: true }
      expect(page.successMode).to.be.true;
    });
  });

  describe('#sendUserCreationEmailConfirmation', () => {
    const prevKey = config.notify.apiKey;
    beforeEach(() => {
      config.notify.apiKey = 'some-key';
    });
    
    after(() => {
      config.notify.apiKey = prevKey;
    });
    
    beforeEach(() => {
      sendEmailStub.resolves();
    });
    
    
    it('sends email successfully', async () => {
      const user = {
        id: 1,
        email: 'email@email.com'
      };
      const temporaryPassword = 'some password'
    
      await page.sendUserCreationEmailConfirmation(user, temporaryPassword);
    
      sinon.assert.calledWith(sendEmailStub,
        config.notify.createTemplateKey,
        user.email,
        {
          personalisation: {
            password: temporaryPassword,
            email: user.email,
            link: config.serviceUrl,
            privacy_link: config.serviceUrl + "privacy-notice"
          },
          reference: `${user.id}`
        },
      );
    });
  });

  describe('#errorValidations',  () => {
    it('throws validation errors', async()=>{
      try{
        await page.errorValidations({ email:null, roles:null, departments:null })
      } catch (err) {
        const usernameEmptyError = { text:'username cannot be empty', href: '#username' }
        const rolesEmptyError = { text:'Roles cannot be empty', href: '#roles' }
        const departmentsError = { text:'Departments cannot be empty', href: '#departments' }
        expect(err.message).to.be.equal('VALIDATION_ERROR')
        expect(err.messages).to.deep.include.members([usernameEmptyError, rolesEmptyError, departmentsError])

      }
      
    })
  })

  describe('#postRequest', () => {
    const roles = ['t1', 't2'];
    const departments = 'd1';
    const email = 'some@email.com';
    const tempPassword = 'some password';
    const user = { user:email,passphrase:tempPassword }
    
    beforeEach(() => {
      page.createUser = sinon.stub().returns(user);
      page.sendUserCreationEmailConfirmation = sinon.stub();
    });
    
    it('creates new user', async () => {
      page.errorValidations = sinon.stub().returns([]);
      page.req.body = { email, departments, roles }
      await page.postRequest(page.req, page.res);
        
      sinon.assert.calledWith(page.errorValidations, { email, departments, roles });
      sinon.assert.calledWith(page.createUser, { email, departments, roles });
      sinon.assert.called(page.sendUserCreationEmailConfirmation);
    
      sinon.assert.calledWith(page.res.redirect, `${page.req.originalUrl}/success`);
    });
    
    it('redirects to original url if error and sets error to flash', async () => {
      const expectedErrors = [{ href: "#username", text: "username cannot be empty" }, { href: "#roles", text: "Roles cannot be empty" }, { href: "#departments", text: "Departments cannot be empty" }]
    
      await page.postRequest(page.req, page.res);
    
      sinon.assert.calledWith(page.req.flash, expectedErrors);
      sinon.assert.calledWith(page.res.redirect, page.req.originalUrl);
    });
  });
});