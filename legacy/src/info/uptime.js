exports.run = (client, message, args) => {
  message.channel.send('uptime!').catch(console.error);
};
