const sinon = require('sinon');
const mysql = require("mysql");

const connection = {
  connect: sinon.stub(),
  query: sinon.stub().callsArgWith(1, null, {})
};

sinon.stub(mysql, 'createConnection').returns(connection);

after(() => {
  mysql.createConnection.restore();
});