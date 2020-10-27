const Page = require('core/pages/page');
const { paths, notify, serviceUrl } = require('config');
const randomString = require('randomstring');
const flash = require('middleware/flash');
const sequelize = require('services/sequelize');
const Role = require("models/role");
const UserRole = require("models/userRole");
const Department = require("models/department");
const DepartmentUser = require("models/departmentUser");
const User = require("models/user");
const authentication = require('services/authentication');
const NotifyClient = require('notifications-node-client').NotifyClient;
const logger = require('services/logger');

const VALIDATION_ERROR_MESSSAGE = 'VALIDATION_ERROR'

class CreateUser extends Page {
  get url() {
    return paths.admin.createUser
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
    }))
    return departments
  }

  async createUserDB(email, transaction) {
    const passphrase = randomString.generate({
      readable: true
    });
    const hashedPassphrase = await authentication.hashPassphrase(passphrase);
    const user = await User.create({
      role: "viewer",
      email: email,
      hashedPassphrase: hashedPassphrase
    }, { transaction });
    return user;
  }

  async createRolesDB(userId, roles, transaction) {
    let rolesToInsert = []
    //roles can be a string or array based on selection count
    Array.isArray(roles) ? (
      roles.forEach(role => rolesToInsert.push({
        userId,
        roleId: role
      }))) : rolesToInsert.push({
      userId,
      roleId: roles
    });
    await UserRole.bulkCreate(rolesToInsert, { transaction });
  }

  async createDepartmentsDB(userId, departments, transaction) {
    let departmentsToInsert = []

    //departments can be a string or array based on selection count
    Array.isArray(departments) ?(
      departments.forEach(department => (
        departmentsToInsert.push({
          userId,
          departmentName: department
        })
      ))) : (departmentsToInsert.push({
      userId,
      departmentName: departments
    }));
    await DepartmentUser.bulkCreate(departmentsToInsert, { transaction });
  }

  async createUser({ email, roles, departments }) {
    const t = await sequelize.transaction();

    try {
      const user = await this.createUserDB(email, t);
      await this.createRolesDB(user.id,roles, t);
      await this.createDepartmentsDB(user.id, departments, t);
      
      await t.commit();
      logger.info(`User ${user.email} created`);

      return user;
    } catch(err) {
      logger.error(`User ${email} creation error ${err.message}`);
      if (t) {
        await t.rollback();
      }
      throw err;
    }
  }

  //TODO: Make this a service as similar method exists in UserManagementAuthentication
  async sendUserCreationEmailConfirmation(user, passphrase) {
    if (notify.apiKey) {
      const notifyClient = new NotifyClient(notify.apiKey);
      notifyClient.sendEmail(
        notify.createTemplateKey,
        user.email,
        {
          personalisation: {
            password: passphrase,
            email: user.email,
            link: serviceUrl,
            privacy_link: serviceUrl + "privacy-notice"
          },
          reference: `${user.id}`
        },
      );
      logger.info(`email with temporary password sent to ${user.email} `);
    }
  }

  async errorValidations({ email, roles, departments }) {
    let error = new Error(VALIDATION_ERROR_MESSSAGE)
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
      const user = await this.createUser({ ...req.body });
      await this.sendUserCreationEmailConfirmation(user.user, user.hashedPassphrase);
      return res.redirect(`${this.req.originalUrl}/success`);
    } catch (error) {
      if (error.message && error.message === VALIDATION_ERROR_MESSSAGE) {
        req.flash(error.messages);
      } else {
        req.flash(error.message);
      }
      return res.redirect(this.req.originalUrl);
    }
  }
}

module.exports = CreateUser;