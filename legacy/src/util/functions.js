const chalk = require('chalk');
const moment = require('moment');

const pool = require('../pool.js');
const { messages } = require('../data');

module.exports = client => {
  client.log = (type, msg) => {
    const timestamp = `[${moment().format('YYYY-MM-DD HH:mm:ss')}]:`;
    switch (type) {
      case 'log': {
        return console.log(
          `${timestamp} ${chalk.black.bold.bgBlue(type.toUpperCase())} ${msg} `
        );
      }
      case 'warn': {
        return console.log(
          `${timestamp} ${chalk.black.bold.bgYellow(
            type.toUpperCase()
          )} ${msg} `
        );
      }
      case 'error': {
        return console.log(
          `${timestamp} ${chalk.bold.bgRed(type.toUpperCase())} ${msg} `
        );
      }
      case 'debug': {
        return console.log(
          `${timestamp} ${chalk.bold.green(type.toUpperCase())} ${msg} `
        );
      }
      case 'cmd': {
        return console.log(
          `${timestamp} ${chalk.black.bgWhite(type.toUpperCase())} ${msg}`
        );
      }
      case 'ready': {
        return console.log(
          `${timestamp} ${chalk.black.bold.bgGreen(type.toUpperCase())} ${msg}`
        );
      }
      default:
        throw new TypeError(
          'Logger type must be either warn, debug, log, ready, cmd or error.'
        );
    }
  };

  client.db = {
    _query: async queryString => {
      let results;
      try {
        results = await pool.query(queryString);
      } catch (err) {
        throw new Error(err);
      }
      return results.length === 1 ? results[0] : results;
    }
  };

  client.loadCommand = command => {
    try {
      const props = require(`../commands/${command}`);
      client.log('cmd', `${props.help.name} loaded - 🤘`);
      // if (props.init) props.init(client);
      client.commands.set(props.help.name, props);
      // Set up some aliases
      props.conf.aliases.forEach(alias => {
        client.aliases.set(alias, props.help.name);
      });
      return false;
    } catch (err) {
      client.log('error', err);
      return `🚫 Unable to load command ${command}: ${err}`;
    }
  };

  client.unloadCommand = async commandName => {
    let command;
    if (client.commands.has(commandName)) {
      command = client.commands.get(commandName);
    } else if (client.aliases.has(commandName)) {
      command = client.commands.get(client.aliases.get(commandName));
    }
    if (!command) {
      return `The command '${commandName}' doesn't seem to exist, nor is it an alias. Try again!`;
    }

    if (command.shutdown) {
      await command.shutdown(client);
    }
    delete require.cache[require.resolve(`../commands/${commandName}.js`)];
    return false;
  };

  client.score = {
    _get: async (user, guildID) => {
      let score;
      try {
        score = await pool.query(
          `SELECT * FROM score WHERE user='${user.id}' AND guild='${guildID}'`
        );
      } catch (err) {
        client.log('error', err);
        throw new Error(err);
      }
      if (typeof score[0] === 'undefined') {
        return {
          id: `${guildID}-${user.id}`,
          user: user.id,
          username: user.username,
          guild: guildID,
          credits: 0,
          level: 1
        };
      }
      return score[0];
    },
    _set: async score => {
      try {
        await pool.query(
          `REPLACE INTO score (id, user, username, guild, credits, level) VALUES ("${
            score.id
          }", "${score.user}", "${score.username}", "${score.guild}", "${
            score.credits
          }", "${score.level}");`
        );
      } catch (err) {
        client.log('error', err);
        throw new Error(err);
      }
      client.log('log', `Score updated for ${score.username} (${score.id})`);
    },
    _generate: () => {
      let min = 5;
      let max = 10;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    _getLevel: credits => {
      return Math.floor(0.1 * Math.sqrt(credits));
    }
  };

  client.cooldownLeft = (timestamp, cooldown) => {
    const now = moment();
    const cooldownEnd = moment(timestamp).add(cooldown, 'milliseconds');
    const minutesLeft = parseInt(
      moment(moment(cooldownEnd).diff(now)).format('m')
    );
    const secondsLeft = parseInt(
      moment(moment(cooldownEnd).diff(now)).format('s')
    );
    let response = '';
    if (minutesLeft > 1 && secondsLeft > 1) {
      response = `${minutesLeft} minutes and ${secondsLeft} seconds`;
    } else if (minutesLeft > 0 && secondsLeft > 1) {
      response = `${minutesLeft} minute and ${secondsLeft} seconds`;
    } else if (secondsLeft > 1) {
      response = `${secondsLeft} seconds`;
    } else if (secondsLeft > 0) {
      response = `${secondsLeft} second`;
    }
    return response;
  };

  client.response = type => {
    return messages[type][Math.floor(Math.random() * messages[type].length)];
  };

  client.reply = (message, response) => {
    message.delete();
    message.reply(response).then(msg => {
      msg.delete(3000);
    });
  };

  client.getChannelByParams = params => {
    if (typeof params === 'string') {
      let channels = client.channels.map(channel => {
        return channel[params];
      });
      return channels;
    } else if (typeof params === 'object') {
      return;
    }
  };

  client.filterChannels = params => {
    if (typeof params === 'string') {
      let channels = client.channels.map(channel => {
        return channel[params];
      });
      return channels;
    } else if (typeof params === 'object') {
      let channels = client.channels.map(channel => {
        let obj = {};
        // Set up each param
        params.forEach(param => {
          obj[param] = channel[`${param}`];
        });
        // Return channel with filtered params
        return obj;
      });
      return channels;
    } else {
      return;
    }
  };

  client.checkPerms = (allowed, current) => {
    return allowed.some(role => current.includes(role));
  };

  client.getGuildRoles = guildName => {
    const guild = client.guilds.filter(guild => guild.name === guildName);
    if (guild.size === 0) return false;
    return guild.map(roles => roles.roles);
  };

  client.getGuildMember = (guild, id) => {
    return guild.members.filter(member => member.user.id === id);
  };
};
