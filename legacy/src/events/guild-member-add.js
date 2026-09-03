const chalk = require('chalk');
const moment = require('moment');
const { channels, roles } = require('../data');

module.exports = client => {
  if (client.user.bot) return client.addRole(roles.bot.id);

  // member.send(`Hi ${member.user.username}, welcome to the server! Cheers 🍺`);

  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
  // const joinedAt = moment(client.joinedTimestamp).format('YYYY-MM-DD HH:mm:ss');
  // const joinedAt = moment(client.joinedTimestamp).format(
  //   'ddd, MMM D, YYYY hh:mm:ss A'
  // );
  // client.send(`Hi ${client.user.username}, welcome to the Darkside!`);
  client.addRole(roles.noob.id);

  // const joinedAt = moment(client.joinedTimestamp).format(
  //   'dddd, MMMM D, YYYY hh:MM:ss A'
  // );

  let msg = `${chalk.bold(client.user.username)} joined the server`;
  console.log(`[${timestamp}]: ${chalk.black.bold.bgBlue('LOG')} ${msg}`);
  if (process.env.NODE_ENV !== 'dev') {
    client.guild.channels
      .get(channels.logs)
      .send(`<@${client.user.id}> has joined the server at **${timestamp}**`);
  }
};
