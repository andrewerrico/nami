const chalk = require('chalk');
const moment = require('moment');
const { channels } = require('../data');
module.exports = client => {
  let now = new Date();
  client.channels
    .get(channels.logs)
    .send(`Disconnected at ${moment(now).format('LLLL')}.`);
  console.log(
    chalk.red('💔 Disconnected at', chalk.inverse(moment(now).format('LLLL')))
  );
};
