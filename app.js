process.env.NTBA_FIX_319 = 1; // needed for telegram issue

const config = require('./config');

const mongoose = require('mongoose');
const Price = require('./models/price');

const TelegramConnector = require('./TelegramConnector.js');
const LiveTradingPair = require('./Exchange.js');


const VERBOSE = false;


const position = {};

let currentPrice = '';
let currentRSI = '';

const CANDLE_KEY_EOS_USD = 'trade:1m:tEOSUSD';
const CANDLE_KEY_BTC_USD = 'trade:1m:tBTCUSD';
const CANDLE_KEY_ETH_USD = 'trade:1m:tETHUSD';

const pairEosUsd = new LiveTradingPair(CANDLE_KEY_EOS_USD, config.pairs.EOSUSD.trailing);
const pairBtcUsd = new LiveTradingPair(CANDLE_KEY_BTC_USD, config.pairs.BTCUSD.trailing);
const pairEthUsd = new LiveTradingPair(CANDLE_KEY_ETH_USD, config.pairs.ETHUSD.trailing);

mongoose.connect('mongodb+srv://unhodl:4y8xktwaoTxNQxUy@unhodl-db-eadeo.mongodb.net/test?retryWrites=true');

TelegramConnector.initBot();
TelegramConnector.sendToChat('- unHODL Bot started...');

const savePriceToDb = async () => {
  const price = new Price({
    _id: new mongoose.Types.ObjectId(),
    pair: 'EOSUSD',
    time: new Date().toLocaleTimeString(),
    price: currentPrice,
  });

  await price.save((err) => {
    if (err) {
      return console.log(err);
    }
    return true;
  });
};

function observerCallback(data) {
  if (data.get('key') === 'candleUpdate') {
    currentPrice = data.get('price');
    currentRSI = data.get('RSI');
    savePriceToDb(currentPrice);
    const msg = `Update for: ${data.get('context').candleKey}: RSI: ${currentRSI} @ ${currentPrice})`;
    console.log(msg);
  } else if (data.get('key') === 'newPos') {
    // const context = data.get('context');
    const msg = `Position opened: \n ${data.get('pos').toString()}`;
    TelegramConnector.sendToChat(msg);
    console.log(msg);
  } else if (data.get('key') === 'closedPos') {
    // const context = data.get('context');
    const msg = `Position closed: \n ${data.get('pos').toString()}`;
    TelegramConnector.sendToChat(msg);
    console.log(msg);
  }
}

pairEosUsd.subscribe(observerCallback);
pairBtcUsd.subscribe(observerCallback);
pairEthUsd.subscribe(observerCallback);

/**
 * Fetches the positions data from exchange via REST
 *
 * @returns
 */
const checkPositions = async () => {
  const positions = await rest.positions();

  if (positions.length === 0) {
    return console.log('no open positions');
  }
  console.log(`${new Date().toLocaleTimeString()} - Pos Amount: ${positions[0].amount}`);
  console.log(`${new Date().toLocaleTimeString()} - Pos P/L: ${(positions[0].pl).toFixed(2)} (${(positions[0].plPerc).toFixed(2)}%)`);
  position.amount = positions[0].amount;
  position.pl = (positions[0].pl).toFixed(2);
  position.plPerc = (positions[0].plPerc).toFixed(2);
  return true;
};

if (VERBOSE) {
  setInterval(() => {
    //checkBalances();
    checkPositions();
  }, 10000);
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
