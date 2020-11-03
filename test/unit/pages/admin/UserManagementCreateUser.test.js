const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const flash = require('middleware/flash');
const Role = require('models/role');
const User = require("models/user");
const UserRole = require("models/userRole");
const Department = require('models/department');
const DepartmentUser = require("models/departmentUser");
const sequelize = require('services/sequelize');
const notify = require('services/notify');
const CreateUser = require('pages/admin/user-management/create-user/CreateUser');
const randomString = require('randomstring');

let page = {};

describe('pages/admin/user-management/create-user/CreateUser', ()=>{
  beforeEach(()=>{
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

  describe('#getRoles', ()=>{
    const rolesDB= [{
      dataValues:{
        id:1, 
        name: 't1'
      } },{
      dataValues:{
        id:2, name: 't2'
      } }];
    const expectedRoles = [{
      value:1,
      text:'t1'
    },{
      value:2,
      text: 't2'
    }]
    beforeEach(()=>{
      Role.findAll = sinon.stub().returns(rolesDB);
    })
    it('return list of roles', async()=>{
      const roles = await page.getRoles();
      sinon.assert.called(Role.findAll)
      expect(roles).to.deep.equal(expectedRoles)
    })
  })

  describe('#getDepartments', ()=>{
    const departmentsDb= [{
      dataValues:{
        name: 'd1'
      } },{
      dataValues:{
        name: 'd2'
      } }];
    const expectedDepartments = [{
      value:'d1',
      text:'d1'
    },{
      value:'d2',
      text: 'd2'
    }]
    beforeEach(()=>{
      Department.findAll = sinon.stub().returns(departmentsDb);
    })
    it('return list of departments', async()=>{
      const departments = await page.getDepartments();
      sinon.assert.called(Department.findAll)
      expect(departments).to.deep.equal(expectedDepartments)
    })
  })

  describe('#createUser', ()=>{
    const email = 'some@email.com'
    const roles = [1,2]
    const departments = 'DIT'
    const t = sequelize.transaction()
    const error = new Error('test error')
    const tempPassword = 'some password'

    beforeEach(()=>{
      page.createRolesDB = sinon.stub().returns();
      page.createDepartmentUserDB = sinon.stub().returns();
      sequelize.transaction = sinon.stub().returns(t);
      sinon.stub(randomString, 'generate').returns(tempPassword);
      sinon.stub(notify,'sendEmailWithTempPassword').returns();
    })

    afterEach(()=>{
      notify.sendEmailWithTempPassword.restore();
      randomString.generate.restore();
    })

    it('inserts user, roles and departments into tables', async ()=>{
      page.createUserDB = sinon.stub().returns({ id:1, email });

      await page.createUser({ email, roles, departments })

      sinon.assert.calledWith(page.createUserDB, email, tempPassword, t)
      sinon.assert.calledWith(page.createRolesDB, 1, roles, t)
      sinon.assert.calledWith(page.createDepartmentUserDB, 1,  departments, t)
      sinon.assert.calledWith(notify.sendEmailWithTempPassword, {
        email, userId:1, password: tempPassword
      })
      sinon.assert.called(t.commit)
    })

    it('rollbacks transactions on error', async ()=>{
      try{
        page.createUserDB = sinon.stub().throws(error)
        await page.createUser({ email, roles, departments })
      } catch(error){
        expect(error.message).to.equal('test error')
      }
      sinon.assert.called(t.rollback)
      sinon.assert.notCalled(page.createRolesDB)
      sinon.assert.notCalled(page.createDepartmentUserDB)
    })
  })

  describe('#createUserDB', ()=>{
    it('inserts user into table', async ()=>{
      const t = await sequelize.transaction();
      const email = 'some@email.com';
      const tempPassword = 'some password';
      User.create = sinon.stub().returns({ id:1 })
    
      const user = await page.createUserDB(email, tempPassword, t);
      sinon.assert.called(User.create);
      expect(user.id).to.equal(1);
    })
  })

  describe('#createRolesDB', ()=>{
    it('inserts roles into table', async ()=>{
      const t = await sequelize.transaction();
      const userId = 1;
      const roles = [1,2]
    
      await page.createRolesDB(userId, roles, t);
      sinon.assert.called(UserRole.bulkCreate);
    })
  })

  describe('#createDepartmentUserDB', ()=>{
    it('inserts departments into table', async ()=>{
      const t = await sequelize.transaction();
      const userId = 1;
      const departments = 'DIT';
    
      await page.createDepartmentUserDB(userId, departments, t);
      sinon.assert.called(DepartmentUser.bulkCreate);
    })
  })

  describe('#errorValidations',  () => {
    it('throws validation errors', async()=>{
      try{
        await page.errorValidations({ email:null, roles:null, departments:null })
      } catch (err) {
        const usernameEmptyError = { text:'Email cannot be empty', href: '#username' }
        const rolesEmptyError = { text:'Roles cannot be empty', href: '#roles' }
        const departmentsError = { text:'Departments cannot be empty', href: '#departments' }
        expect(err.message).to.be.equal('VALIDATION_ERROR')
        expect(err.messages).to.deep.include.members([usernameEmptyError, rolesEmptyError, departmentsError])

      }
    })
    it('throws email exists', async()=>{
      try{
        User.findOne = sinon.stub().returns({ id:1 })
        await page.errorValidations({ email:'some@email', roles:'1', departments:'BIS' })
      } catch (err) {
        const userExistsError = { text:'Email exists', href: '#username' }
        expect(err.message).to.be.equal('VALIDATION_ERROR')
        expect(err.messages).to.deep.include.members([userExistsError])
      }
    })
  })

  describe('#postRequest', () => {
    const roles = ['t1', 't2'];
    const departments = 'd1';
    const email = 'some@email.com';
    const tempPassword = 'some password';
    const user = { user:email, passphrase:tempPassword }
    
    beforeEach(() => {
      page.createUser = sinon.stub().returns(user);
    });
    
    it('creates new user', async () => {
      page.errorValidations = sinon.stub().returns([]);
      page.req.body = { email, departments, roles }
      await page.postRequest(page.req, page.res);
        
      sinon.assert.calledWith(page.errorValidations, { email, departments, roles });
      sinon.assert.calledWith(page.createUser, { email, departments, roles });
    
      sinon.assert.calledWith(page.res.redirect, `${page.req.originalUrl}/success`);
    });
    
    it('redirects to original url if error and sets error to flash', async () => {
      const expectedErrors = [{ href: "#username", text: "Email cannot be empty" }, { href: "#roles", text: "Roles cannot be empty" }, { href: "#departments", text: "Departments cannot be empty" }]
    
      await page.postRequest(page.req, page.res);
    
      sinon.assert.calledWith(page.req.flash, expectedErrors);
      sinon.assert.calledWith(page.res.redirect, page.req.originalUrl);
    });
  });
});