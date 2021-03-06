const { TradingPair } = require('./TradingPair.js');
const { TradeTrigger, Condition } = require('./TradeTrigger.js');
const { Indicator } = require('./Indicator.js');
const { PositionType } = require('./Position.js');

// import LiveTradingPair from './TradingPair';

process.env.NTBA_FIX_319 = 1; // needed for telegram issue

const config = require('./conf/config');
const Exchange = require('./Exchange.js');

const TelegramConnector = require('./TelegramConnector.js');

const CANDLE_KEY_EOS_USD_1M = 'trade:1m:tEOSUSD';
const CANDLE_KEY_EOS_USD_5M = 'trade:5m:tEOSUSD';

const CANDLE_KEY_BTC_USD_1M = 'trade:1m:tBTCUSD';
const CANDLE_KEY_BTC_USD_5M = 'trade:5m:tBTCUSD';

const CANDLE_KEY_ETH_USD_1M = 'trade:1m:tETHUSD';
const CANDLE_KEY_ETH_USD_5M = 'trade:5m:tETHUSD';

const currentdate = new Date();


TelegramConnector.initBot();
TelegramConnector.sendToChat(`*unHODL* Bot started on ${currentdate.toLocaleDateString('de-DE')}... \u{1F911}`);


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
    console.log(`${time} - ${msg}`);
  }
}

const exchange = new Exchange(config.bitfinex.key, config.bitfinex.secret, config.trading.startBalance);


if (config.pairs.EOSUSD.enable) {
  const indicatorMap = new Map();
  // indicatorMap.set(Indicator.RSI, CANDLE_KEY_EOS_USD_1M);
  indicatorMap.set(Indicator.ADX, CANDLE_KEY_EOS_USD_1M);
  indicatorMap.set(Indicator.SAR, CANDLE_KEY_EOS_USD_5M);
  const pairEosUsd =
    new TradingPair(exchange, indicatorMap, config.pairs.EOSUSD.trailing);

  const rsiConditionRise = new Condition(config.pairs.EOSUSD.rsiLongValue, true, false, Indicator.RSI, pairEosUsd);
  const rsiConditionFall = new Condition(config.pairs.EOSUSD.rsiShortValue, false, true, Indicator.RSI, pairEosUsd);
  const adxConditionRise = new Condition(config.pairs.EOSUSD.adxValue, true, false, Indicator.ADX, pairEosUsd);
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
  indicatorMap.set(Indicator.RSI, CANDLE_KEY_BTC_USD_1M);
  indicatorMap.set(Indicator.ADX, CANDLE_KEY_BTC_USD_1M);
  indicatorMap.set(Indicator.SAR, CANDLE_KEY_BTC_USD_1M);

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
  indicatorMap.set(Indicator.RSI, CANDLE_KEY_ETH_USD_1M);
  indicatorMap.set(Indicator.ADX, CANDLE_KEY_ETH_USD_1M);
  indicatorMap.set(Indicator.SAR, CANDLE_KEY_ETH_USD_1M);

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

// Testing Area ---------------------------

/*
const bfxREST = bfx.rest(2, {
  transform: true,
});

function checkPrice() {
  if (config.bitfinex.key !== '') {
    const rest = bfx.rest(2, {
      transform: true,
    });
    rest.ticker('tEOSUSD', (err, res) => {
      if (err) console.log(err);
      console.log(`Bid:  ${res.bid}`);
      console.log(`Ask:  ${res.ask}`);
    });
  }
}

// Execute Order

const { Order } = require('./node_modules/bitfinex-api-node/lib/models');

 bfxWS.once('auth', () => {
  const o = new Order({
    cid: Date.now(),
    symbol: 'tETHUSD',
    amount: -0.1,
    price: 600,
    type: Order.type.LIMIT,
  }, bfxWS);

  // Enable automatic updates
  o.registerListeners();

  o.on('update', () => {
    console.log(`order updated: ${o.serialize()}`);
  });

  o.on('close', () => {
    console.log(`order closed: ${o.status}`);
    bfxWS.close();
  });

  o.submit().then(() => {
    console.log(`submitted order ${o.id}`);
  }).catch((err) => {
    console.error(err);
    bfxWS.close();
  });
});

 ws.open();
 */
