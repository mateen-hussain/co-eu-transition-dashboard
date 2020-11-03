const Page = require('core/pages/page');
const { paths } = require('config');
const randomString = require('randomstring');
const flash = require('middleware/flash');
const sequelize = require('services/sequelize');
const Role = require("models/role");
const UserRole = require("models/userRole");
const Department = require("models/department");
const DepartmentUser = require("models/departmentUser");
const User = require("models/user");
const authentication = require('services/authentication');
const notify = require('services/notify');
const logger = require('services/logger');

const VALIDATION_ERROR_MESSSAGE = 'VALIDATION_ERROR';

class CreateUser extends Page {
  get url() {
    return paths.admin.createUser;
  }

  get pathToBind() {
    return `${this.url}/:success(success)?`;
  }

  get middleware() {
    return [ 
      ...authentication.protect(['admin']), 
      flash 
    ]
  }

  get successMode() {
    return this.req.params && this.req.params.success;
  }
  
  async getRoles() {
    const roles = await Role.findAll().map(role => ({
      value: role.dataValues.id,
      text: role.dataValues.name
    }));
    return roles;
  }

  async getDepartments() {
    const departments = await Department.findAll().map(dept => ({
      value: dept.dataValues.name,
      text: dept.dataValues.name,
    }));
    return departments;
  }

  async createUserDB(email, password, transaction) {
    const hashedPassphrase = await authentication.hashPassphrase(password);
    const user = await User.create({
      role: "viewer",
      email: email,
      hashedPassphrase: hashedPassphrase
    }, { transaction });
    return user;
  }

  async createRolesDB(userId, roles, transaction) {
    let rolesToInsert = [];
    
    //roles can be a string or array based on selection count
    if (Array.isArray(roles)) {
      roles.forEach(role => rolesToInsert.push({
        userId,
        roleId: role
      }));
    } else {
      rolesToInsert.push({
        userId,
        roleId: roles
      });
    }
    
    return UserRole.bulkCreate(rolesToInsert, { transaction });
  }

  async createDepartmentUserDB(userId, departments, transaction) {
    let departmentsToInsert = [];

    //departments can be a string or array based on selection count
    if (Array.isArray(departments) ) {
      departments.forEach(department => (
        departmentsToInsert.push({
          userId,
          departmentName: department
        })
      ));
    } else {
      departmentsToInsert.push({
        userId,
        departmentName: departments
      });
    }

    return DepartmentUser.bulkCreate(departmentsToInsert, { transaction });
  }

  async createUser({ email, roles, departments }) {
    const t = await sequelize.transaction();
    const tempPassword = randomString.generate({
      readable: true
    });

    try {
      const user = await this.createUserDB(email, tempPassword, t);
      const userRoles = await this.createRolesDB(user.id,roles, t);
      const departmentUser = await this.createDepartmentUserDB(user.id, departments, t);
      await notify.sendEmailWithTempPassword({ email: user.email, userId: user.id, password: tempPassword } )
      
      await t.commit();

      logger.info(`User ${user.email} created`);
      logger.info(`Userroles ${userRoles} created`);
      logger.info(`DepartmentUser ${departmentUser} created`);

      return user;
    } catch(err) {
      logger.error(`User ${email} creation error ${err.message}`);
      if (t) {
        logger.info(`User ${email} creation rollback`);
        await t.rollback();
      }
      throw err;
    }
  }

  async errorValidations({ email, roles, departments }) {
    let error = new Error(VALIDATION_ERROR_MESSSAGE);
    error.messages = [];
    let userExists;
    if (!email) {
      error.messages.push({ text:'Email cannot be empty', href: '#username' });
    } else {
      // Check if user exists
      userExists = await User.findOne({ where: { email } });
    }
    if (userExists) {
      error.messages.push({ text:'Email exists', href: '#username' });
    }
    if (!roles) {
      error.messages.push({ text:'Roles cannot be empty', href: '#roles' });
    }
    if(!departments) {
      error.messages.push({ text:'Departments cannot be empty', href: '#departments' });
    }
    if (error.messages.length > 0) {
      throw error;
    } 
  }

  async postRequest(req, res) {
    try{
      await this.errorValidations({ ...req.body });
      await this.createUser({ ...req.body });
      return res.redirect(`${this.req.originalUrl}/success`);
    } catch (error) {
      let flashMessages ;
      if (error.message && error.message === VALIDATION_ERROR_MESSSAGE) {
        flashMessages= error.messages;
      } else if (error.message) {
        flashMessages = [{ text: error.message }]; 
      } else {
        flashMessages =[{ text:"something went wrong" }];
      }
      req.flash(flashMessages)
      return res.redirect(this.req.originalUrl);
    }
  }
}

module.exports = CreateUser;