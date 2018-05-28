const config = {};

config.telegram = {};
config.bitfinex = {};

config.telegram.token = process.env.TELEGRAM_TOKEN || 'PUT TOKEN HERE';
config.telegram.chat = process.env.TELEGRAM_CHAT || 'PUT CHAT ID HERE';
config.bitfinex.key = process.env.BITFINEX_KEY || 'PUT API KEY HERE';
config.bitfinex.secret = process.env.BITFINEX_SECRET || 'PUT API SECRET HERE';

module.exports = config;