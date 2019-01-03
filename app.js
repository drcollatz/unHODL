const { TradingPair } = require('./TradingPair.js');
const { TradeTrigger, Condition } = require('./TradeTrigger.js');
const { Indicator } = require('./Indicator.js');
const { PositionType } = require('./Position.js');

const logger = require('./node_modules/js-logger');
const config = require('./conf/config');
const Exchange = require('./Exchange.js');

const TelegramConnector = require('./TelegramConnector.js');

const exchange = new Exchange(config.bitfinex.key, config.bitfinex.secret);

TelegramConnector.initBot();

logger.useDefaults();
logger.setLevel(logger.DEBUG);


/**
 *
 *
 * @param {*} data
 */
function observerCallback(data) {
  if ((data.get('key') === 'newPos') || (data.get('key') === 'closedPos')) {
    const msg = `*Position:*\n${data.get('pos').toString()}`;
    TelegramConnector.sendToChat(msg);
    const time = new Date().toLocaleTimeString();
    logger.info(`${time} - ${msg}`);
  }
}

if (config.pairs.EOSUSD.enable) {
  const indicatorMap = new Map();
  // indicatorMap.set(Indicator.RSI, Indicator.CANDLE_KEY_EOS_USD_1M);
  indicatorMap.set(Indicator.ADX, Indicator.CANDLE_KEY_EOS_USD_1M);
  indicatorMap.set(Indicator.SAR, Indicator.CANDLE_KEY_EOS_USD_1M);
  const pairEosUsd =
    new TradingPair(exchange, indicatorMap, config.pairs.EOSUSD.trailing);

  // const rsiConditionRise = new Condition(config.pairs.EOSUSD.rsiLongValue, true, false, Indicator.RSI, pairEosUsd);
  // const rsiConditionFall = new Condition(config.pairs.EOSUSD.rsiShortValue, false, true, Indicator.RSI, pairEosUsd);
  // const adxConditionRise = new Condition(config.pairs.EOSUSD.adxValue, true, false, Indicator.ADX, pairEosUsd);
  const sarConditionUP = new Condition(0, true, false, Indicator.SAR, pairEosUsd); // for short
  const sarConditionDOWN = new Condition(0, false, true, Indicator.SAR, pairEosUsd); // for long
  const openLongTrigger = new TradeTrigger(sarConditionDOWN, PositionType.LONG);
  // openLongTrigger.addCondition(adxConditionRise);
  // openLongTrigger.addCondition(sarConditionDOWN);
  const openShortTrigger = new TradeTrigger(sarConditionUP, PositionType.SHORT);
  // openShortTrigger.addCondition(adxConditionRise);
  // openShortTrigger.addCondition(sarConditionUP);

  pairEosUsd.addTrigger(openLongTrigger);
  pairEosUsd.addTrigger(openShortTrigger);
  pairEosUsd.subscribe(observerCallback);

  pairEosUsd.goLive();
}
if (config.pairs.BTCUSD.enable) {
  const indicatorMap = new Map();
  indicatorMap.set(Indicator.RSI, Indicator.CANDLE_KEY_BTC_USD_1M);
  indicatorMap.set(Indicator.ADX, Indicator.CANDLE_KEY_BTC_USD_1M);
  indicatorMap.set(Indicator.SAR, Indicator.CANDLE_KEY_BTC_USD_1M);

  const pairBtcUsd =
    new TradingPair(exchange, indicatorMap, config.pairs.BTCUSD.trailing);

  const rsiConditionRise = new Condition(config.pairs.BTCUSD.rsiLongValue, true, false, Indicator.RSI, pairBtcUsd);
  const rsiConditionFall = new Condition(config.pairs.BTCUSD.rsiShortValue, false, true, Indicator.RSI, pairBtcUsd);
  const adxConditionRise = new Condition(config.pairs.BTCUSD.adxValue, true, false, Indicator.ADX, pairBtcUsd);
  const openLongTrigger = new TradeTrigger(rsiConditionRise, PositionType.LONG);
  openLongTrigger.addCondition(adxConditionRise);
  const openShortTrigger = new TradeTrigger(rsiConditionFall, PositionType.SHORT);
  openShortTrigger.addCondition(adxConditionRise);

  pairBtcUsd.addTrigger(openLongTrigger);
  pairBtcUsd.addTrigger(openShortTrigger);
  pairBtcUsd.subscribe(observerCallback);

  pairBtcUsd.goLive();
}
if (config.pairs.ETHUSD.enable) {
  const indicatorMap = new Map();
  indicatorMap.set(Indicator.RSI, Indicator.CANDLE_KEY_ETH_USD_1M);
  indicatorMap.set(Indicator.ADX, Indicator.CANDLE_KEY_ETH_USD_1M);
  indicatorMap.set(Indicator.SAR, Indicator.CANDLE_KEY_ETH_USD_1M);

  const pairEthUsd =
    new TradingPair(exchange, indicatorMap, config.pairs.ETHUSD.trailing);

  // const rsiConditionRise = new Condition(config.pairs.ETHUSD.rsiLongValue, true, false, Indicator.RSI, pairEthUsd);
  // const rsiConditionFall = new Condition(config.pairs.ETHUSD.rsiShortValue, false, true, Indicator.RSI, pairEthUsd);
  // const adxConditionRise = new Condition(config.pairs.ETHUSD.adxValue, true, false, Indicator.ADX, pairEthUsd);
  const sarConditionUP = new Condition(0, true, false, Indicator.SAR, pairEthUsd);
  const sarConditionDOWN = new Condition(0, false, true, Indicator.SAR, pairEthUsd);
  const openLongTrigger = new TradeTrigger(sarConditionDOWN, PositionType.LONG);
  // openLongTrigger.addCondition(sarConditionDOWN);
  const openShortTrigger = new TradeTrigger(sarConditionUP, PositionType.SHORT);
  // openShortTrigger.addCondition(sarConditionUP);

  pairEthUsd.addTrigger(openLongTrigger);
  pairEthUsd.addTrigger(openShortTrigger);
  pairEthUsd.subscribe(observerCallback);

  pairEthUsd.goLive();
}
