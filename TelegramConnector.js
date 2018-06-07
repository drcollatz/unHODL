const TelegramBot = require('node-telegram-bot-api');
const config = require('./conf/config.js');
const { TradingPair } = require('./TradingPair.js');
const Balance = require('./Balance');

let bot;

module.exports = {
  sendToChat(msg) {
    bot.sendMessage(config.telegram.chat, `${new Date().toLocaleTimeString()} - ${msg}`, { parse_mode: 'Markdown' });
  },

  initBot() {
    bot = new TelegramBot(config.telegram.token, {
      polling: true,
    });
    /* do some init stuff */
    bot.onText(/\/balance/, async () => {
      const b = new Balance();
      const balance = await b.getBalance();
      bot.sendMessage(
        config.telegram.chat,
        `Available balance: ${balance.available}\nAvailable amount: ${balance.amount}`,
      );
    });

    bot.onText(/\/close/, () => {
      bot.sendMessage(config.telegram.chat, 'close received - implementation pending');
    });

    bot.onText(/\/pos/, () => {
      TradingPair.activePairs.forEach((pair) => {
        if (pair.activePosition != null) {
          const msg = pair.activePosition.toString();
          bot.sendMessage(
            config.telegram.chat,
            msg,
            { parse_mode: 'Markdown' },
          );
        } else {
          bot.sendMessage(
            config.telegram.chat,
            `No active positions for active pair ${pair.candleKey}`,
          );
        }
      });
    });

    bot.onText(/\/price/, () => {
      TradingPair.activePairs.forEach(pair =>
        bot.sendMessage(
          config.telegram.chat,
          `Coin: ${pair.coin} - Current price: ${pair.currentPrice}`,
        ));
    });

    bot.onText(/\/alive/, () => {
      bot.sendMessage(config.telegram.chat, 'Yes sir!');
    });

    bot.onText(/\/help/, () => {
      bot.sendMessage(
        config.telegram.chat,
        "Hello I'm your unHODL bot.\nHere is the list of my commands:\n\n" +
          '/balance to get balances\n/close to close open positions\n/pos to list open positions\n/price to get the current price',
      );
    });

    bot.on('polling_error', (error) => {
      console.log(`Telegram Error - ${error.message}`);
      bot.openWebHook();
      bot.sendMessage(config.telegram.chat, `Error: ${error.message}`);
    });
  },
};
