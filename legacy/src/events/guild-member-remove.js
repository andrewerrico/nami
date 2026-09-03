const chalk = require('chalk');
const moment = require('moment');
const { roles, channels } = require('../data');

module.exports = client => {
  if (client.user.bot) return client.addRole(roles.bot);
  // const leftAt = moment().format('ddd, MMM D, YYYY hh:mm:ss A');
  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
  let msg = `${chalk.bold(client.user.username)} left the server`;
  console.log(`[${timestamp}]: ${chalk.black.bold.bgBlue('LOG')} ${msg}`);
  if (process.env.NODE_ENV !== 'dev') {
    client.guild.channels
      .get(channels.logs)
      .send(`<@${client.user.id}> has left the server at **${timestamp}**`);
  }
};
