const chalk = require('chalk');
const moment = require('moment');
const { channels, messages, roles } = require('../data');

module.exports = (reaction, user) => {
  const guildMember = reaction.message.guild.members.get(user.id);
  const currentRoles = guildMember.roles.map(role => role.name);
  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');

  if (currentRoles.includes(roles.user.id)) {
    let msg = `${user.username} already has the role ${roles.user.name}!`;
    guildMember.removeRole(roles.noob.id);
    return console.log(
      `[${timestamp}]: ${chalk.black.bold.bgYellow('WARN')} ${msg}`
    );
  }

  if (
    reaction.message.id === config.messages.rules &&
    reaction.emoji.name === config.getStartedEmoji
  ) {
    guildMember.removeRole(roles.noob.id);
    guildMember.addRole(roles.user.id);

    let msg = `${user.username} added to ${roles.user.name} role!`;
    console.log(`[${timestamp}]: ${chalk.black.bold.bgBlue('LOG')} ${msg}`);

    // console.log(chalk.yellow(`${user.username} added to Hoppers!`));
    // let welcomeMessage = messages.welcome(user.username);
    // guildMember.client.channels.get(channels.general).send(welcomeMessage);
  }
};
