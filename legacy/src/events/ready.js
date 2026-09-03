const chalk = require('chalk');
const log = console.log;
const { channels } = require('../data');

module.exports = async (client, message) => {
  process.on('SIGINT', () => {
    log('\nGracefully shutting down from SIGINT (Ctrl-C)');
    // some other closing procedures go here
    // db.destroy();
    process.exit();
  });

  const readyMessage = `\n*** ${config.name} v${config.version} Ready ***\n`;

  if (process.env.NODE_ENV === 'dev')
    log(chalk.green.bold('Running in development mode!'));
  log(chalk.blue.bold(readyMessage));

  try {
    // let link = await client.generateInvite(['ADMINISTRATOR']);
    // log(link);
    // Dev bot does not have permissions for this...
    // if (process.env.NODE_ENV !== 'dev') {
    // Fetch Pinned Rules in welcome channel
    const channel = client.channels.get(channels.welcome);
    await channel
      .fetchPinnedMessages()
      .then(log(chalk.green('Pinned Rules Fetched Successfully\n')));
    // }
  } catch (e) {
    log(e.stack);
  }
};
