process.env.NTBA_FIX_319 = 1; // needed for telegram issue

const TelegramBot = require('node-telegram-bot-api');
const config = require('./conf/config.js');
const logger = require('./node_modules/js-logger');
const { TradingPair } = require('./TradingPair.js');
const Balance = require('./Balance');

let bot;
const startDate = new Date();

module.exports = {
  sendToChat(msg) {
    bot.sendMessage(config.telegram.chat, `${new Date().toLocaleTimeString('de-DE')} - ${msg}`, { parse_mode: 'Markdown' });
  },

  initBot() {
    bot = new TelegramBot(config.telegram.token, {
      polling: true,
    });
    /* do some init stuff */

    this.sendToChat(`*unHODL* Bot started on ${startDate.toLocaleDateString('de-DE')}... \u{1F911}`);

    function showOptions() {
      const options = {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: 'Balance', callback_data: '1' }],
            [{ text: 'Price', callback_data: '2' }],
            [{ text: 'Close', callback_data: '3' }],
            [{ text: 'Position', callback_data: '4' }],
            [{ text: 'Alive', callback_data: '5' }],
            [{ text: 'Help', callback_data: '6' }],
            [{ text: 'StartTime', callback_data: '7' }],
          ],
          selective: true,
        }),
      };
      bot.sendMessage(config.telegram.chat, 'chose option', options);
    }

    async function getBalance() {
      const b = new Balance();
      const balance = await b.getBalance();
      bot.sendMessage(
        config.telegram.chat,
        `Available balance: ${(balance.balance).toFixed(2)} USD`,
      );
    }

    async function getPosition() {
      const b = new Balance();
      const balance = await b.getBalance();
      bot.sendMessage(
        config.telegram.chat,
        `Position pl: ${balance.positions.pl}`,
      );
    }

    function getPos() {
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
            `No active positions for active pair ${pair.coin}`,
          );
        }
      });
    }

    function getPrice() {
      TradingPair.activePairs.forEach(pair =>
        bot.sendMessage(
          config.telegram.chat,
          `Coin: ${pair.coin} - Current price: ${pair.currentPrice}`,
        ));
    }

    function getAlive() {
      bot.sendMessage(config.telegram.chat, 'Yes sir!');
    }

    function getHelp() {
      bot.sendMessage(
        config.telegram.chat,
        "Hello I'm your unHODL bot.\nHere is the list of my commands:\n\n" +
        '/balance to get balances\n/close to close open positions\n/pos to list open positions\n/price to get the current price',
      );
    }

    function closePos() {
      bot.sendMessage(config.telegram.chat, 'close received - implementation pending');
    }

    function getStartTime() {
      bot.sendMessage(
        config.telegram.chat,
        `Running since ${startDate.toString()}`,
      );
    }

    bot.on('message', (msg) => {
      // Strip off possible @BotName in case the Bot is used in a group chat.
      const command = /\/[a-zA-Z]*/.exec(msg.text)[0];
      switch (command) {
        case ('/balance'): {
          getBalance();
          break;
        }
        case ('/options'): {
          showOptions();
          break;
        }
        case ('/position'): {
          getPosition();
          break;
        }
        case ('/close'): {
          closePos();
          break;
        }
        case ('/pos'): {
          getPos();
          break;
        }
        case ('/price'): {
          getPrice();
          break;
        }
        case ('/alive'): {
          getAlive();
          break;
        }
        case ('/help'): {
          getHelp();
          break;
        }

        case ('/starttime'): {
          getStartTime();
          break;
        }
        default: break;
      }
    });

    bot.on('polling_error', (error) => {
      logger.error(`Telegram Error - ${error.message}`);
      bot.openWebHook();
      bot.sendMessage(config.telegram.chat, `Error: ${error.message}`);
    });

    bot.on('callback_query', (callbackQuery) => {
      const action = callbackQuery.data;
      const msg = callbackQuery.message;
      const opts = {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
      };
      switch (parseInt(action, 10)) {
        case (1): getBalance(); break;
        case (2): getPrice(); break;
        case (3): closePos(); break;
        case (4): getPos(); break;
        case (5): getAlive(); break;
        case (6): getHelp(); break;
        case (7): getStartTime(); break;
        default: break;
      }
      bot.deleteMessage(opts.chat_id, opts.message_id);
    });
  },
};
