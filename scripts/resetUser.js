const config = require('config');
const authentication = require('services/authentication');
const readlineSync = require("readline-sync");
const User = require("models/user");
const Department = require("models/department");
const DepartmentUser = require("models/departmentUser");
const NotifyClient = require('notifications-node-client').NotifyClient;
const randomString = require('randomstring');
const getopts = require('getopts');

const options = getopts(process.argv.slice(2), {
  default: {
    email: null
  }
});

let email = options.email;

if (!email) {
  email = readlineSync.question("Enter email: ");
}

let passphrase = randomString.generate({
  readable: true
});
authentication.hashPassphrase(passphrase).then( (hashedPassphrase) => {
  User.findOne({
    where: {
      email: email,
    }
  }).then( (user) => {
    user.hashedPassword = hashedPassphrase;
    user.mustChangePassword = true;
    user.twofaSecret = null;
    user.save();
    if (config.notify.apiKey) {
      let notifyClient = new NotifyClient(config.notify.apiKey);
      notifyClient.sendEmail(
        config.notify.createTemplateKey,
        email,
        {
          personalisation: {
            password: passphrase,
            email: email,
            link: config.serviceUrl
          },
          reference: `${user.id}`
        },
      );
      console.log(`User ${email} reset and sent with password`);
    } else {
      console.log(`User ${email} reset with password ${passphrase}`);
    }
  }).catch( (err) => {
    console.log(`Could not create user [${err}]`);
  });
});

