const chalk = require('chalk');
const moment = require('moment');
const { roles } = require('../data');

module.exports = async (reaction, user) => {
  const guildMember = reaction.message.guild.members.get(user.id);
  const currentRoles = guildMember.roles.map(role => role.name);
  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');

  if (
    reaction.message.id === config.messages.rules &&
    reaction.emoji.name === config.getStartedEmoji
  ) {
    guildMember.removeRole(roles.user.id);
    guildMember.addRole(roles.noob.id);

    let msg = `${user.username} removed from ${roles.user.name} role!`;
    console.log(`[${timestamp}]: ${chalk.black.bold.bgBlue('LOG')} ${msg}`);
  }
};
