const moment = require('moment');

// const { roles } = require('../data');

let now = new Date();
exports.run = (client, message, args) => {
  console.log(`🏓 Pinged at ${moment(now).format('LLLL')}`);
  message.channel
    .send(`🏓 Pong! \`${Date.now() - message.createdTimestamp}ms\``)
    .catch(console.error);
};

exports.conf = {
  aliases: [],
  permissions: 'Admin'
};

exports.help = {
  name: 'ping',
  category: 'Miscellaneous',
  description: 'It... like... pings. Then Pongs. And it"s not Ping Pong.',
  usage: 'ping'
};
