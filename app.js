process.env.NTBA_FIX_319 = 1; // needed for telegram issue

const config = require('./config');

const mongoose = require('mongoose');
const Price = require('./models/price');
const { RSI } = require('technicalindicators');

var TelegramConnector = require('./TelegramConnector.js');
var LiveTradingPair = require('./Exchange.js');


const balance = {};
const position = {};

let currentPrice = '';
let currentRSI = '';

let takeProfitOrderPrice = '';
let stopLossOrderPrice = '';
let positionOpen = false;
let blockOpeningNewPosition = false;


const CANDLE_KEY_EOS_USD = 'trade:1m:tEOSUSD';
const CANDLE_KEY_BTC_USD = 'trade:1m:tBTCUSD';


mongoose.connect('mongodb+srv://unhodl:4y8xktwaoTxNQxUy@unhodl-db-eadeo.mongodb.net/test?retryWrites=true');

TelegramConnector.initBot();
TelegramConnector.sendToChat(`- unHODL Bot started...`);


function observerCallback(data){

  currentPrice = data.get('price');
  currentRSI = data.get('RSI');

  //checkClosing();
  //savePriceToDb();
  if (blockOpeningNewPosition &&
      (currentRSI < config.indicators.rsi.longValue &&
        currentRSI > config.indicators.rsi.shortValue)) {
      blockOpeningNewPosition = false;
    }
    if (currentRSI >= config.indicators.rsi.longValue &&
      !positionOpen &&
      !blockOpeningNewPosition) {
      // open long position
      takeProfitOrderPrice = (Exchange.currentPrice * (1 + (config.trading.takeProfitPerc / 100))).toFixed(3);
      stopLossOrderPrice = (Exchange.currentPrice * (1 - (config.trading.stopLossPerc / 100))).toFixed(3);
      positionOpen = 'long';
      handleOpenPosition();
    } else if (currentRSI <= config.indicators.rsi.shortValue &&
      !positionOpen &&
      !blockOpeningNewPosition) {
      // open short position
      takeProfitOrderPrice = (Exchange.currentPrice * (1 - (config.trading.takeProfitPerc / 100))).toFixed(3);
      stopLossOrderPrice = (Exchange.currentPrice * (1 + (config.trading.stopLossPerc / 100))).toFixed(3);
      positionOpen = 'short';
      handleOpenPosition();
    }
    let time = `${new Date().toLocaleTimeString()}`;
    console.log(time);
    console.log(data);
}

function observerCallbackBTC(data){
    let time = `${new Date().toLocaleTimeString()}`;
    console.log(time);
    console.log(data);
}

var pairEosUsd = new LiveTradingPair(CANDLE_KEY_EOS_USD);
pairEosUsd.subscribe(observerCallback);

var pairBtcUsd = new LiveTradingPair(CANDLE_KEY_BTC_USD);
pairBtcUsd.subscribe(observerCallbackBTC);


function checkClosing() {
  let success = false;
  let closed = false;
  if ((positionOpen === 'long' && currentPrice >= takeProfitOrderPrice) ||
    (positionOpen === 'short' && currentPrice <= takeProfitOrderPrice)) {
    positionOpen = false;
    success = true;
    closed = true;
  } else if ((positionOpen === 'long' && currentPrice <= stopLossOrderPrice) ||
    (positionOpen === 'short' && currentPrice >= stopLossOrderPrice)) {
    positionOpen = false;
    success = false;
    closed = true;
  }
  if (closed) {
    const msg = `${new Date().toLocaleTimeString()} - Postition closed @: ${(success) ? `${takeProfitOrderPrice} (SUCCESS)` : `${stopLossOrderPrice} (FAILED)`}`;
    console.log(msg);
    if (telegramOnline) {
      TelegramConnector.sendToChat(msg);
    }
  }
}

function handleOpenPosition() {
  blockOpeningNewPosition = true;
  const msg = `${new Date().toLocaleTimeString()} - RSI: ${currentRSI} @ ${currentPrice} \n(TP: ${takeProfitOrderPrice})\n(SL: ${stopLossOrderPrice})`;
  console.log(msg);
  console.log('Postition opened');
  TelegramConnector.sendToChat(msg);
}



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

const checkPostitions = async () => {
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

const checkBalances = async () => {
  const balances = await rest.balances();
  balances.forEach((b) => {
    if (b.type === 'trading' && b.currency === 'usd') {
      console.log(`${new Date().toLocaleTimeString()} - Wallet amount: ${b.amount}`);
      console.log(`${new Date().toLocaleTimeString()} - Wallet available: ${b.available}`);
      balance.available = b.available;
      balance.amount = b.amount;
    }
  });
};





setInterval(() => {
  checkBalances();
  checkPostitions();
}, 10000);



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
