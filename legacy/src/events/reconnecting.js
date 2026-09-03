const chalk = require('chalk');
const moment = require('moment');
module.exports = client => {
  const timestamp = `[${moment().format('YYYY-MM-DD HH:mm:ss')}]:`;

  console.log(
    `${timestamp} ${chalk.black.bold.bgYellow('WARN')} Reconnecting!`
  );
};
