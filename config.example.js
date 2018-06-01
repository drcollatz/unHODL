const config = {};

config.telegram = {};
config.bitfinex = {};
config.pairs = {};
config.pairs.EOSUSD = {};
config.pairs.BTCUSD = {};
config.pairs.ETHUSD = {};
config.indicators = {};
config.indicators.rsi = {};
config.trading = {};

config.telegram.token = process.env.TELEGRAM_TOKEN || 'PUT API KEY HERE';
config.telegram.chat = process.env.TELEGRAM_CHAT || 'PUT API KEY HERE';
config.bitfinex.key = process.env.BITFINEX_KEY || 'PUT API KEY HERE';
config.bitfinex.secret = process.env.BITFINEX_SECRET || 'PUT API SECRET HERE';

config.indicators.rsi.longValue = 70;
config.indicators.rsi.shortValue = 30;

config.pairs.EOSUSD.enable = true;
config.pairs.EOSUSD.key = 'trade:1m:tEOSUSD';
config.pairs.EOSUSD.rsiLongValue = 70;
config.pairs.EOSUSD.rsiShortValue = 30;
config.pairs.EOSUSD.trailing = true;

config.pairs.BTCUSD.enable = true;
config.pairs.BTCUSD.key = 'trade:1m:tBTCUSD';
config.pairs.BTCUSD.rsiLongValue = 70;
config.pairs.BTCUSD.rsiShortValue = 30;
config.pairs.BTCUSD.trailing = true;

config.pairs.ETHUSD.enable = true;
config.pairs.ETHUSD.key = 'trade:1m:tETHUSD';
config.pairs.ETHUSD.rsiLongValue = 70;
config.pairs.ETHUSD.rsiShortValue = 30;
config.pairs.ETHUSD.trailing = true;

config.trading.takeProfitPerc = 0.4;
config.trading.stopLossPerc = 1;

module.exports = config;
