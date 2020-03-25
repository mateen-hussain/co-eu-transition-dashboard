const config = require('config');
const authentication = require('services/authentication');
const readline = require("readline");
const User = require("models/user");
const NotifyClient = require('notifications-node-client').NotifyClient;
const randomString = require('randomstring');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("Enter email: ", (email) => {
  let passphrase = randomString.generate({
    readable: true
  });
  rl.close();
  rl.removeAllListeners();
  authentication.hashPassphrase(passphrase).then( (hashedPassphrase) => {
    User.create({
      role: "user",
      email: email,
      hashedPassphrase: hashedPassphrase
    }).then( (user) => {
      if (config.notify.apiKey) {
        let notifyClient = new NotifyClient(config.notify.apiKey);
        notifyClient.sendEmail(
          config.notify.createTemplateKey,
          email,
          {
            personalisation: {
              password: passphrase
            },
            reference: user.id
          },
        );
        console.log(`User ${email} created and email sent with password`);
      } else {
        console.log(`User ${email} created with password ${passphrase}`);
      }
    });
  }).catch( (err) => {
    console.log(`Could not create user [${err}]`);
  });
});



