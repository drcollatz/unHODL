const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
var LiveTradingPair = require('./Exchange.js');

var bot;

var telegramConfig = {};



module.exports = {

    telegramConfig,

    sendToChat: function (msg) {
        bot.sendMessage(config.telegram.chat, `${new Date().toLocaleTimeString()} - ${msg}`);
    },

    initBot : function()  {
        bot = new TelegramBot(config.telegram.token, {
        polling: true,
      });
        /* do some init stuff */
        bot.onText(/\/balance/, () => {
            bot.sendMessage(config.telegram.chat,`Available balance: ${balance.available}\nAvailable amount: ${balance.amount}`);
        });
                  
        bot.onText(/\/close/, () => {
            bot.sendMessage(config.telegram.chat,`close received - implementation pending`);
        });
                  
        bot.onText(/\/pos/, () => {
            bot.sendMessage(config.telegram.chat,`Open position \nAmount: ${(position.amount).toFixed(2)} \nP/L: ${position.pl} (${position.plPerc} %)`);
        });
                  
        bot.onText(/\/price/, () => {
            LiveTradingPair.activePairs.forEach((pair) => bot.sendMessage(config.telegram.chat,`Pair: ${pair.candleKey} - Current price: ${pair.currentPrice}`));
            
        });

        bot.onText(/\/alive/, () => {
            bot.sendMessage(config.telegram.chat,`Yes sir!`);
        });
        
        bot.on('polling_error', (error) => {
            console.log(`Telegram Error - ${error.message}`);
            bot.openWebHook();
            bot.sendMessage(config.telegram.chat,`Error: ${error.message}`);
        });

    }
};

