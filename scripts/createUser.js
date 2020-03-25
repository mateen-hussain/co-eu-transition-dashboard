const config = require('config');
const authentication = require('services/authentication');
const readline = require("readline");
const User = require("models/user");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("Enter email: ", (email) => {
  rl.question("Enter passphrase: ", (passphrase) => {
    authentication.hashPassphrase(passphrase).then( (hashedPassphrase) => {
      User.create({
        role: "user",
        email: email,
        hashedPassphrase: hashedPassphrase
      });

      console.log(`User ${email} created`);
      rl.close();
    }).catch( (err) => {
      console.log(`Could not create user [${err}]`);
      rl.close();
    });
  });
});



