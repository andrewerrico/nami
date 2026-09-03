const request = require('request');
const Discord = require('discord.js');

exports.run = async (client, message, args) => {
  if (!args[0]) {
    message.delete();
    return message.reply('you must provide a username to check!').then(msg => {
      msg.delete(3000);
    });
  }

  const streamerName = args.join(' ');

  let clientID;
  if (typeof process.env.twitch_client_id !== 'undefined') {
    clientID = process.env.twitch_client_id;
  } else {
    const auth = require('../../auth.json');
    clientID = auth.streams.twitch;
  }

  const streamerUserInfo = async () => {
    await request(
      `${config.apiURL.twitch}/users/${encodeURI(
        streamerName
      )}?client_id=${clientID}`,
      (error, response, body) => {
        let userInfo = JSON.parse(body);
        if (!error && response.statusCode === 404)
          return message.channel.send(`User **${streamerName}** not found!`);
        else if (!error && response.statusCode === 200)
          return message.channel.send(
            `**${userInfo.display_name}** is currently offline!`
          );
        else if (!error && response.statusCode === 422)
          return message.channel.send(
            `Error with query **${streamerName}** please provide a proper username!`
          );
      }
    );
  };
  await request(
    `${config.apiURL.twitch}/streams/${encodeURI(
      streamerName
    )}?client_id=${clientID}`,
    (error, response, body) => {
      if (error)
        return message.channel.send(
          `Sorry there was an unknown problem completing your request for **${streamerName}**.`
        );

      if (!error && response.statusCode === 400)
        return message.channel.send(
          `Error with query **${streamerName}** please provide a proper username!`
        );

      if (!error && response.statusCode === 404)
        return message.channel.send(`User **${streamerName}** not found!`);

      if (!error && response.statusCode === 200) {
        const twitchInfo = JSON.parse(body);

        // This streamer is not online, but it's possible the username is in
        // Twitch database so we need double check this and then provide a
        // proper message about the streamer's status
        if (!twitchInfo.stream) {
          streamerUserInfo();
          return;
        }

        if (twitchInfo.stream.stream_type === 'offline') {
          return message.channel.send(
            `**${
              twitchInfo.stream.channel.display_name
            }** is currently offline!`
          );
        }

        let streamDescription;
        let streamTitle;
        if (twitchInfo.stream.stream_type === 'rerun') {
          streamTitle = `${
            twitchInfo.stream.channel.display_name
          }'s Stream (RERUN)`;
          streamDescription = `${
            twitchInfo.stream.channel.display_name
          } is running a rerun of ${twitchInfo.stream.game} right now!`;
        } else {
          streamTitle = `${
            twitchInfo.stream.channel.display_name
          }'s Stream (LIVE)`;
          streamDescription = `${
            twitchInfo.stream.channel.display_name
          } is live right now!`;
        }

        // console.log(mixerInfo);
        // Create a nice embed
        const embed = new Discord.RichEmbed()
          .setTitle(streamTitle)
          .setColor(0x00ae86)
          .setDescription(streamDescription)
          .setURL(twitchInfo.stream.channel.url)
          .setThumbnail(twitchInfo.stream.channel.logo)
          // .setTimestamp()
          .addField('Playing', twitchInfo.stream.game)
          .addField('Title', twitchInfo.stream.channel.status)
          .addField('Followers', twitchInfo.stream.channel.followers)
          .addField('Current Viewers', twitchInfo.stream.viewers)
          .addField('Total Views', twitchInfo.stream.channel.views);

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
  name: 'twitch',
  category: 'Miscellaneous',
  description: 'Check if a Twitch streamer is live.',
  usage: 'twitch [name]'
};
