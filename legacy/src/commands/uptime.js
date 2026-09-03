exports.run = (client, message, args) => {
  const botName = client.user.username;
  let totalSeconds = client.uptime / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  let uptime = '';
  if (hours > 0) {
    if (hours === 1) {
      uptime = `${hours} hour `;
    } else {
      uptime = `${hours} hours `;
    }
  }
  if (minutes > 0) {
    if (minutes === 1) {
      uptime += `${minutes} minute and `;
    } else {
      uptime += `${minutes} minutes and `;
    }
  }
  if (seconds === 1) {
    uptime += `${seconds} second`;
  } else {
    uptime += `${seconds} seconds`;
  }
  message.channel.send(`**${botName}** has been up and running for ${uptime}!`);
};

exports.conf = {
  aliases: []
};

exports.help = {
  name: 'uptime',
  category: 'Stats',
  description: 'How long the bot has been running',
  usage: 'uptime'
};
