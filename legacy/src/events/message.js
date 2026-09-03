const { channels } = require('../data');

module.exports = async message => {
  if (message.author.bot) return;
  if (message.channel.type === 'dm') return;

  let client = message.client;

  // Generate some credits when participating in discord
  if (!message.content.startsWith(config.prefix)) {
    if (process.env.NODE_ENV === 'dev') return;

    // get score from db
    let score = await client.score._get(message.author, message.guild.id);
    let earnedCredits = client.score._generate();
    score.credits = score.credits + earnedCredits;
    score.level = client.score._getLevel();
    client.score._set(score);
    return;
  } else {
    let args = message.content.split(' ');
    const command = args
      .shift()
      .slice(config.prefix.length)
      .toLowerCase();
    args = args.filter(arg => {
      return arg !== '';
    });

    const cmd =
      client.commands.get(command) ||
      client.commands.get(client.aliases.get(command));

    if (!cmd) return;

    // Don't run inactive commands!
    if (cmd.conf && cmd.conf.active === false) return;

    // we will now check permissions to make sure the user can run the command
    const { permissions } = require('../data');
    // set the default permissions level in case permissions are not set within the command
    let permLevel = 'user';
    if (cmd.conf && cmd.conf.permissions)
      permLevel = cmd.conf.permissions.toLowerCase();

    let rolesAllowed = permissions[permLevel];
    // grab the users current roles and check permissions
    const usersCurrentRoles = message.member.roles.map(role => role.id);
    const hasPermission = client.checkPerms(rolesAllowed, usersCurrentRoles);
    if (!hasPermission) {
      message.delete();
      return message.reply(client.response('error')).then(msg => {
        msg.delete(3000);
      });
    }

    // TODO: set up casino ...

    cmd.run(client, message, args);
    return;
  }
};
