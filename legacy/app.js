const Discord = require('discord.js');
const client = new Discord.Client();
const chalk = require('chalk');
const fs = require('fs');
const moment = require('moment');

const { promisify } = require('util');
const readdir = promisify(require('fs').readdir);

const config = require('./config.json');

// set token
let token;
if (typeof process.env.token !== 'undefined') {
  token = process.env.token;
} else {
  const auth = require('./auth.json');
  if (process.env.NODE_ENV === 'dev') {
    token = auth.development.token;
  } else {
    token = auth.production.token;
  }
}

// Let's start by getting some useful functions that we'll use throughout
// the bot, like logs and elevation features.
require('./src/util/functions.js')(client);

// Load our global event loader
require('./src/util/event-loader.js')(client);

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();

global.config = config;

// Change prefix if in dev mode
if (process.env.NODE_ENV === 'dev') config.prefix = '_';

const init = async () => {
  // load commands into memory as a collection
  const cmdFiles = await readdir('./src/commands/');
  client.log('log', `Loading a total of ${cmdFiles.length} commands.`);
  cmdFiles.forEach(f => {
    if (!f.endsWith('.js')) return;
    const response = client.loadCommand(f);
    if (response) console.log(response);
  });

  client.login(token).catch(err => console.log(err));
};

// clear console
console.log('\033[2J');

init();

// client.on('channelCreate', channel => {
//   console.log(
//     chalk.yellow(
//       `A ${channel.type} channel named ${channel.name} was created at ${
//         channel.createdAt
//       } with the ID of ${channel.id}`
//     )
//   );
// });

// const reload = (message, cmd) => {
//   delete require.cache[require.resolve(`./src/commands/${cmd}`)];
//   try {
//     let cmdFile = require(`./src/commands/${cmd}`);
//   } catch (err) {
//     message.channel
//       .send(`Problem loading **${cmd}**: ${err}`)
//       // .then(response =>
//       //   response.delete(1000).catch(error => console.log(error.stack))
//       // )
//       .catch(error => console.log(chalk.red.bold(error.stack)));
//   }
//   message.channel
//     .send(`Command **${cmd}** reloaded successfully.`)
//     // .then(response =>
//     //   response.delete(1000).catch(error => console.log(error.stack))
//     // )
//     .catch(error => console.log(chalk.red.bold(error.stack)));
// };

// exports.reload = reload;

// client.login(config.token);
