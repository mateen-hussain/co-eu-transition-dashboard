const config = require('config');
const sequelize = require('services/sequelize');
const authentication = require('services/authentication');
const readlineSync = require("readline-sync");
const User = require("models/user");
const UserRole = require("models/userRole");
const Role = require("models/role");
const Department = require("models/department");
const DepartmentUser = require("models/departmentUser");
const NotifyClient = require('notifications-node-client').NotifyClient;
const randomString = require('randomstring');
const getopts = require('getopts');
const csvsync = require('csvsync');
const fs = require('fs');


async function readCsvUsers(filename) {
  const csv = fs.readFileSync(filename);
  const users = csvsync.parse(csv);
  let result = [];
  users.forEach( (userArray) => {
    if (userArray.length > 3) {
      throw `CSV row with too many entries found ${userArray[0]}`;
    }
    result.push({
      email: userArray[0],
      departmentsString: userArray[1],
      rolesString: userArray[2]
    });
  });

  return result;
}

async function getDepartments(string) {
  let departments = string.split(",");
  const result = await Department.findAll({
    where: {
      name: departments
    }
  });
  if (departments.length != result.length) {
    throw `Could not find departments [${string}]`;
  }
  return result;
}

async function getRoles(string) {
  let roles = string.split(",");
  const result = await Role.findAll({
    where: {
      name: roles 
    }
  });
  if (roles.length != result.length) {
    throw `Could not find roles [${string}]`;
  }
  return result;
}

async function getAllDepartments() {
  return await Department.findAll();
}

async function getAllRoles() {
  return await Role.findAll();
}

async function createDepartmentUsers(transaction,user,departments) {
  for (let i=0;i<departments.length;i++) {
    await DepartmentUser.create({
      userId: user.id,
      departmentName: departments[i].name
    },{
      transaction: transaction
    });
  }
}

async function createUser(email,passphrase,departments,roles) {
  const t = await sequelize.transaction();

  try {
    const hashedPassphrase = await authentication.hashPassphrase(passphrase);
    const user = await User.create({
      role: "viewer",
      email: email,
      hashedPassphrase: hashedPassphrase
    },{
      transaction: t
    });
    
    await createUserRoles(t,user,roles);
    await createDepartmentUsers(t,user,departments);

    await t.commit();

    return user;
  } catch(err) {
    if (t) {
      await t.rollback();
    }
    throw err;
  }
}

async function createUserRoles(transaction,user,roles) {
  for (let i=0;i<roles.length;i++) {
    await UserRole.create({
      userId: user.id,
      roleId: roles[i].id
    },{
      transaction: transaction
    });
  }
}

const options = getopts(process.argv.slice(2), {
  default: {
    email: null,
    departments: null,
    roles: null,
    csv: null,
  }
});

let csvFile = options.csv;

let users = [];

if (csvFile) {
  users = readCsvUsers(csvFile);
} else {
  let email = options.email;
  let departmentsString = options.departments;
  let rolesString = options.roles;

  if (!email || !departmentsString || !rolesString) {
    email = readlineSync.question("Enter email: ");
    departmentsString = readlineSync.question("Enter departments (seperated by ',', use 'all' for all departments): ");
    rolesString = readlineSync.question("Enter roles (seperated by ',', use 'all' for all roles): ");
  }
  users[0] = {
    email: email,
    departmentsString: departmentsString,
    rolesString: rolesString
  };
}


Promise.resolve(users).then( (users) => {
  for (let i=0;i<users.length;i++) {
    const user = users[i];
    const email = user.email;
    const departmentsString = user.departmentsString;
    const rolesString = user.rolesString;

    if (email.includes('@')) {

      let departments = [];
      if (departmentsString == "all") {
        departments = getAllDepartments();
      } else {
        departments = getDepartments(departmentsString);
      }

      let roles = [];
      if (rolesString == "all") {
        roles = getAllRoles();
      } else {
        roles = getRoles(rolesString);
      }

      Promise.all([departments,roles]).then( (args) => {
        const [departmentsArray,rolesArray] = args;
        try {
          const passphrase = randomString.generate({
            readable: true
          });
          createUser(email,passphrase,departmentsArray,rolesArray).then( (user) => {
            if (config.notify.apiKey) {
              let notifyClient = new NotifyClient(config.notify.apiKey);
              notifyClient.sendEmail(
                config.notify.createTemplateKey,
                email,
                {
                  personalisation: {
                    password: passphrase,
                    email: email,
                    link: config.serviceUrl,
                    privacy_link: config.serviceUrl + "privacy-notice"
                  },
                  reference: `${user.id}`
                },
              );
              console.log(`User ${email} created with departments ${departmentsString} and roles ${rolesString} and sent email with password`);
            } else {
              console.log(`User ${email} created with departments ${departmentsString} and roles ${rolesString} and password ${passphrase}`);
            }
          });
        } catch(err) {
          console.log(`Could not create user [${err}]`);
        }

        return;
      });
    } else {
      console.log(`Skipping user ${email} as it does not appear to be an email address`);
    }
  }
});
