const sinon = require('sinon');
const mysql = require("mysql");

const connection = {
  connect: sinon.stub(),
  query: sinon.stub()
};

sinon.stub(mysql, 'createConnection').returns(connection);

after(() => {
  mysql.createConnection.restore();
});