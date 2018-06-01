const config = {};

config.telegram = {};
config.bitfinex = {};
config.indicators = {};
config.indicators.rsi = {};
config.trading = {};

config.telegram.token = process.env.TELEGRAM_TOKEN || '606390384:AAFoP0gS3pWeKUA8Otph1cCRDDK-a1qx-ws';
config.telegram.chat = process.env.TELEGRAM_CHAT || '177582728';
config.bitfinex.key = process.env.BITFINEX_KEY || 'PUT API KEY HERE';
config.bitfinex.secret = process.env.BITFINEX_SECRET || 'PUT API SECRET HERE';

config.indicators.rsi.longValue = 70;
config.indicators.rsi.shortValue = 30;

config.trading.takeProfitPerc = 0.4;
config.trading.stopLossPerc = 1;

module.exports = config;
