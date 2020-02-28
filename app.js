const express = require('express');
const nunjucks = require('./middleware/nunjucks');
const webpack = require('./middleware/webpack');
const session = require('./middleware/session');
const pages = require('./pages');
const bodyParser = require('body-parser');

const app = module.exports = express();

app.use(bodyParser.urlencoded({ extended: false }));

nunjucks.configureViews(app);
nunjucks.configureNunjucks(app);

webpack.configure(app);

session.attach(app);

pages.attach(app);

// const path = require('path')
// const bodyParser = require('body-parser')

// const port = process.env.PORT || 5000





// // paths to folders
// app.set('views', path.join(__dirname, 'views'))
// app.use(express.static(path.join(__dirname, 'scss')))
// app.use(express.static(path.join(__dirname, 'public')))
// app.use('/assets', express.static(path.join(__dirname, '/node_modules/govuk-frontend/govuk/assets')))
// app.use('/govuk', express.static(path.join(__dirname, '/node_modules/govuk-frontend/govuk')))
// app.use('/jquery', express.static(path.join(__dirname, '/node_modules/jquery-ui-dist')))

// app.use(bodyParser.json())
// app.use(bodyParser.urlencoded({ extended: true }))

// app.use(require('./routes'))

// var server = app.listen(port, function () {
//   console.log('Listening on port ' + server.address().port)
// })

// module.exports = app


// const express = require('express')
// const app = express();
// const config = require('config');

// const pgp = require("pg-promise")();
// const db = pgp(config.services.postgres.url);

// db.any(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`)
//   .then(console.log);

// app.get('/', function (req, res) {
//   res.send('Hello World');
// });

// app.listen(3000);