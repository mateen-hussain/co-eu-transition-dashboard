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

  async createUser({ email, roles, departments }) {
    const t = await sequelize.transaction();
    let rolesToInsert = []
    let departmentsToInsert = []
    const passphrase = randomString.generate({
      readable: true
    });
    const hashedPassphrase = await authentication.hashPassphrase(passphrase);

    try {
      const user = await User.create({
        role: "viewer",
        email: email,
        hashedPassphrase: hashedPassphrase
      }, { transaction: t });

      //roles can be a string or array based on selection count
      Array.isArray(roles) ? (
        roles.forEach(role => rolesToInsert.push({
          userId: user.id,
          roleId: role
        }))) : rolesToInsert.push({
        userId: user.id,
        roleId: roles
      })
      await UserRole.bulkCreate(rolesToInsert, { transaction: t })
      
      //departments can be a string or array based on selection count
      Array.isArray(departments) ?(
        departments.forEach(department => (
          departmentsToInsert.push({
            userId: user.id,
            departmentName: department
          })
        ))) : (departmentsToInsert.push({
        userId: user.id,
        departmentName: departments
      }))
      await DepartmentUser.bulkCreate(departmentsToInsert, { transaction: t })

      await t.commit()
      return {
        user,
        passphrase: hashedPassphrase
      }
    } catch(err) {
      if (t) {
        await t.rollback();
      }
      throw err;
    }
  }

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
    }
  }

  async errorValidations({ email, roles, departments }) {
    let errors = []
    let userExists;
    if (!email) {
      errors.push({ text:'username cannot be empty', href: '#username' })
    } else {
      // Check if user exists
      userExists = await User.findOne({ where: { email } })
    }
    if (userExists) {
      errors.push({ text:'User name exists', href: '#username' })
    }
    if (!roles) {
      errors.push({ text:'Roles cannot be empty', href: '#roles' })
    }
    if(!departments) {
      errors.push({ text:'Departments cannot be empty', href: '#departments' })
    }
    return errors;
  }

  //TODO: logger
  async postRequest(req, res) {
    const errors = await this.errorValidations({ ...req.body })
    if (errors.length > 0) {
      req.flash(errors)
      return res.redirect(`${this.req.originalUrl}`);
    }

    const user = await this.createUser({ ...req.body })
    await this.sendUserCreationEmailConfirmation(user.user, user.passphrase)
    return res.redirect(`${this.req.originalUrl}/success`);
  }
}

module.exports = CreateUser;