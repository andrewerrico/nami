exports.run = async (client, message) => {
  let response;
  let score = await client.score._get(message.author, message.guild.id);
  // Create the response
  if (score.credits === 0) {
    response = `You have **${score.credits}** credits!!!`;
  } else if (score.credits === 1) {
    response = `you currently have **${score.credits}** credit.`;
  } else {
    response = `you currently have **${score.credits}** credits.`;
  }
  message.reply(response);
};

exports.conf = {
  aliases: ['score']
};

exports.help = {
  name: 'credits',
  // category: 'Games',
  description: 'Returns the amount of credits you currently have.',
  usage: 'credits'
};
