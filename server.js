const config = require('config');
const app = require('./app');

app.listen(config.port, function(){
  console.log(`App available at http://localhost:${config.port}`);
});

process.on('SIGTERM', () => {
  http.close(() => {
    process.exit(0);
  });
});