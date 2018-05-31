var config = {};

config.telegram = {};
config.bitfinex = {};

config.telegram.token = process.env.TELEGRAM_TOKEN || '606390384:AAFoP0gS3pWeKUA8Otph1cCRDDK-a1qx-ws';
config.telegram.chat=  process.env.TELEGRAM_CHAT || '177582728';
config.bitfinex.key = process.env.BITFINEX_KEY || 'PUT API KEY HERE';
config.bitfinex.secret = process.env.BITFINEX_SECRET || 'PUT API SECRET HERE';

module.exports = config;