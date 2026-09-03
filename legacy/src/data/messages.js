module.exports = {
  games: {
    win: [],
    lose: []
  },
  success: ['congrats'],
  error: [
    'lol you can\'t do that!',
    'you can\'t use that command!',
    'you don\'t have permission to use that command!'
  ],
  beer: [
    'Cheers!',
    'Is it happy hour already?',
    'How about this one?',
    'Are we feeling a little thirsty?'
  ],

  welcome: username => {
    const messages = [
      `**${username}** just joined. Everyone, look busy!`,
      `**${username}** joined. You must construct additional pylons.`,
      `Welcome, **${username}**. We were expecting you.`,
      `**${username}** has joined. Stay a while and listen!`,
      `Hey! Listen! **${username}** has joined!`,
      `**${username}** just joined the server - glhf!`,
      `It's dangerous to go alone, take **${username}**!`,
      `Ermagherd. **${username}** is here.`,
      `**${username}** is here to kick butt and chew bubblegum. And **${username}** is all out of gum.`,
      `**${username}** just showed up. Hold my beer`,
      `Challenger approaching - **${username}** has appeared!`,
      `Ready player **${username}**`,
      `Welcome, **${username}**. We hope you brought pizza.`,
      `It's a bird! It's a plane! Nevermind, it's just **${username}**.`,
      `Roses are red, violets are blue, **${username}** joined this server with you`,
      `Cheers, love! **${username}** is here!`,
      `**${username}** just arrived. Seems OP - please nerf.`,
      `**${username}** just slid into the server.`,
      `It's **${username}**! Praise the sun! \[T]/`,
      `Hello. Is it **${username}** you're looking for?`,
      `**${username}** just joined. Can I get a heal?`,
      `A **${username}** has spawned in the server.Last Sunday at 10:43 PM`,
      `Where’s **${username}**? In the server!`,
      `**${username}** is here, as the prophecy foretold.`,
      `Welcome, **${username}**. We were expecting you ( ͡° ͜ʖ ͡°)`,
      `Never gonna give **${username}** up. Never gonna let **${username}** down.`,
      `A wild **${username}** appeared.`,
      `**${username}** showed up!`,
      `Here's **${username}** and in my experience there is no such thing as luck.`,
      `I find your lack of faith disturbing, **${username}**.`,
      `Watch out **${username}**, it's a trap!`,
      `Help me **${username}**. You're my only hope.`,
      `**${username}** is here! Power! _Unlimited_ power!`,
      `Oh, my dear **${username}**. How I've missed you.`,
      `**${username}**, we're home`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
};
