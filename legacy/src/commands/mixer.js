const request = require('request');
const Discord = require('discord.js');

exports.run = async (client, message, args) => {
  if (!args[0])
    return message.reply('you must provide a mixer username to check!');

  const streamerName = args.join(' ');

  await request(
    `${config.apiURL.mixer}/${encodeURI(streamerName)}`,
    (error, response, body) => {
      if (error) return console.log(`User ${streamerName} not found!`);

      if (!error && response.statusCode === 404)
        return message.channel.send(`User **${streamerName}** not found!`);

      if (!error && response.statusCode === 200) {
        const mixerInfo = JSON.parse(body);
        if (!mixerInfo.online) {
          return message.channel.send(
            `**${mixerInfo.token}** is currently offline!`
          );
        }
        // Create a nice embed
        const embed = new Discord.RichEmbed()
          .setTitle(`${mixerInfo.token}'s Stream`)
          .setColor(0x00ae86)
          .setDescription(`${mixerInfo.token} is LIVE right now!`)
          .setURL(`http://mixer.com/${mixerInfo.token}`)
          .setThumbnail(mixerInfo.user.avatarUrl)
          // .setTimestamp()
          .addField('Playing', mixerInfo.type.name)
          .addField('Title', mixerInfo.name)
          .addField('Followers', mixerInfo.numFollowers)
          .addField('Mixer Level', mixerInfo.user.level)
          .addField('Current Viewers', mixerInfo.viewersCurrent)
          .addField('Total Views', mixerInfo.viewersTotal);

        return message.channel.send({ embed });
      }
    }
  );
  return;
};

exports.conf = {
  aliases: []
};

exports.help = {
  name: 'mixer',
  category: 'Miscellaneous',
  description: 'Check if a Mixer streamer is live.',
  usage: 'mixer [name]'
};
