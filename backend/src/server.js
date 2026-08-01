const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`SAAP CFLCMA-CI API [${config.appEnv}] sur le port ${config.port}`);
});
