const TradingPair = require('./TradingPair.js').TradingPair;
const TradeTrigger = require('./TradeTrigger.js').TradeTrigger;
const Condition = require('./TradeTrigger.js').Condition;
const Indicator = require('./Indicator.js').Indicator;
const PositionType = require('./Position.js').PositionType;

// import LiveTradingPair from './TradingPair';

process.env.NTBA_FIX_319 = 1; // needed for telegram issue

const config = require('./conf/config');
const Exchange = require('./Exchange.js');

const TelegramConnector = require('./TelegramConnector.js');

const CANDLE_KEY_EOS_USD = 'trade:1m:tEOSUSD';
const CANDLE_KEY_BTC_USD = 'trade:1m:tBTCUSD';
const CANDLE_KEY_ETH_USD = 'trade:1m:tETHUSD';

TelegramConnector.initBot();
TelegramConnector.sendToChat('*unHODL* Bot started...');

/**
 *
 *
 * @param {*} data
 */
function observerCallback(data) {
  const time = new Date().toLocaleTimeString();
  if (data.get('key') === 'newPos') {
    // const context = data.get('context');
    const msg = `* ${time} - Position opened: *\n${data.get('pos').toString()}`;
    TelegramConnector.sendToChat(msg);
    console.log(msg);
  } else if (data.get('key') === 'closedPos') {
    // const context = data.get('context');
    const msg = `* ${time} - Position closed: *\n${data.get('pos').toString()}`;
    TelegramConnector.sendToChat(msg);
    console.log(msg);
  }
}

const exchange = new Exchange(config.bitfinex.key, config.bitfinex.secret);


if (config.pairs.EOSUSD.enable) {
  const pairEosUsd =
    new TradingPair(exchange, CANDLE_KEY_EOS_USD, config.pairs.EOSUSD.trailing);
  const rsiConditionRise = new Condition(70, true, false, Indicator.RSI, pairEosUsd);
  const rsiConditionFall = new Condition(30, false, true, Indicator.RSI, pairEosUsd);
  const tradeTriggerRsiLong = new TradeTrigger(rsiConditionRise, PositionType.LONG);
  const tradeTriggerRsiShort = new TradeTrigger(rsiConditionFall, PositionType.SHORT);

  pairEosUsd.addTrigger(tradeTriggerRsiLong);
  pairEosUsd.addTrigger(tradeTriggerRsiShort);
  pairEosUsd.subscribe(observerCallback);
}
if (config.pairs.BTCUSD.enable) {
  const pairBtcUsd =
    new TradingPair(exchange, CANDLE_KEY_BTC_USD, config.pairs.BTCUSD.trailing);
  const rsiConditionRise = new Condition(70, true, false, Indicator.RSI, pairBtcUsd);
  const rsiConditionFall = new Condition(30, false, true, Indicator.RSI, pairBtcUsd);
  const tradeTriggerRsiLong = new TradeTrigger(rsiConditionRise, PositionType.LONG);
  const tradeTriggerRsiShort = new TradeTrigger(rsiConditionFall, PositionType.SHORT);

  pairBtcUsd.addTrigger(tradeTriggerRsiLong);
  pairBtcUsd.addTrigger(tradeTriggerRsiShort);
  pairBtcUsd.subscribe(observerCallback);
}
if (config.pairs.ETHUSD.enable) {
  const pairEthUsd =
    new TradingPair(exchange, CANDLE_KEY_ETH_USD, config.pairs.ETHUSD.trailing);
  const rsiConditionRise = new Condition(70, true, false, Indicator.RSI, pairEthUsd);
  const rsiConditionFall = new Condition(30, false, true, Indicator.RSI, pairEthUsd);
  const tradeTriggerRsiLong = new TradeTrigger(rsiConditionRise, PositionType.LONG);
  const tradeTriggerRsiShort = new TradeTrigger(rsiConditionFall, PositionType.SHORT);

  pairEthUsd.addTrigger(tradeTriggerRsiLong);
  pairEthUsd.addTrigger(tradeTriggerRsiShort);
  pairEthUsd.subscribe(observerCallback);
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
