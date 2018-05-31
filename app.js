process.env.NTBA_FIX_319 = 1; // needed for telegram issue

const config = require('./config');
const BFX = require('bitfinex-api-node');

const mongoose = require('mongoose');
const Price = require('./models/price');
const { RSI } = require('technicalindicators');
const TelegramBot = require('node-telegram-bot-api');

const CANDLE_KEY = 'trade:1m:tEOSUSD';
const VERBOSE = false;
const telegramOnline = true;
const balance = {};
const position = {};
let currentPrice = '';
let currentRSI = '';
let takeProfitOrderPrice = '';
let stopLossOrderPrice = '';
let positionOpen = false;
let stopLossBasePrice = '';
let blockOpeningNewPosition = false;

mongoose.connect('mongodb+srv://unhodl:4y8xktwaoTxNQxUy@unhodl-db-eadeo.mongodb.net/test?retryWrites=true');

const bot = new TelegramBot(config.telegram.token, {
  polling: true,
});

bot.onText(/\/balance/, () => {
  bot.sendMessage(config.telegram.chat, `Available balance: ${balance.available}\nAvailable amount: ${balance.amount}`);
});

bot.onText(/\/close/, () => {
  bot.sendMessage(config.telegram.chat, 'close received - implementation pending');
});

bot.onText(/\/pos/, () => {
  bot.sendMessage(config.telegram.chat, `Open position \nAmount: ${(position.amount).toFixed(2)} \nP/L: ${position.pl} (${position.plPerc} %)`);
});

bot.onText(/\/price/, () => {
  bot.sendMessage(config.telegram.chat, `Current price: ${currentPrice}`);
});

bot.onText(/\/help/, () => {
  bot.sendMessage(config.telegram.chat, 'Hello I\'m your unHODL bot.\nHere is the list of my commands:\n\n' +
  '/balance to get balances\n/close to close open positions\n/pos to list open positions\n/price to get the current price');
});

const bfx = new BFX({
  apiKey: config.bitfinex.key,
  apiSecret: config.bitfinex.secret,
  ws: {
    autoReconnect: true,
    seqAudit: true,
    packetWDDelay: 10 * 1000,
  },
});

const ws = bfx.ws(2, {
  manageCandles: true, // enable candle dataset persistence/management
  transform: true, // converts ws data arrays to Candle models (and others)
});

const rest = bfx.rest(2, {
  transform: true,
});

if (telegramOnline) bot.sendMessage(config.telegram.chat, `${new Date().toLocaleTimeString()} - unHODL Bot started...`);
/**
 * Trailing of stop loss limit if profit increase
 */
function updateStopLoss() {
  if (positionOpen === 'long' && currentPrice > stopLossBasePrice) {
    stopLossOrderPrice = (currentPrice * (1 - (config.trading.stopLossPerc / 100))).toFixed(3);
    stopLossBasePrice = currentPrice;
    console.log(`Stop Loss updated to: ${stopLossOrderPrice}`);
  } else if ((positionOpen === 'short' && currentPrice < stopLossBasePrice)) {
    stopLossOrderPrice = (currentPrice * (1 + (config.trading.stopLossPerc / 100))).toFixed(3);
    stopLossBasePrice = currentPrice;
    console.log(`Stop Loss updated to: ${stopLossOrderPrice}`);
  }
}
/**
 * Checks if the position closing conditions are met.
 */
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
    const msg = `${new Date().toLocaleTimeString()} - Position closed @: ${(success) ? `${takeProfitOrderPrice} (SUCCESS)` : `${stopLossOrderPrice} (FAILED)`}`;
    console.log(msg);
    if (telegramOnline) {
      bot.sendMessage(config.telegram.chat, msg);
    }
  }
  updateStopLoss();
}
/**
 * Opens a position.
 */
function handleOpenPosition() {
  blockOpeningNewPosition = true;
  stopLossBasePrice = currentPrice;
  const msg = `${new Date().toLocaleTimeString()} - RSI: ${currentRSI} @ ${currentPrice} \n(TP: ${takeProfitOrderPrice})\n(SL: ${stopLossOrderPrice})`;
  console.log(msg);
  console.log('Position opened');
  if (telegramOnline) {
    bot.sendMessage(config.telegram.chat, msg);
  }
}
/**
 * Calculates the RSI indicator and determines if a position should be opened
 * @param {any} closeData
 */
function rsiCalculation(closeData) {
  const inputRSI = {
    values: closeData,
    period: 14,
  };
  const rsiResultArray = RSI.calculate(inputRSI);
  currentRSI = rsiResultArray[rsiResultArray.length - 1];

  if (blockOpeningNewPosition &&
    (currentRSI < config.indicators.rsi.longValue &&
      currentRSI > config.indicators.rsi.shortValue)) {
    blockOpeningNewPosition = false;
  }
  if (currentRSI >= config.indicators.rsi.longValue &&
    !positionOpen &&
    !blockOpeningNewPosition) {
    // open long position
    takeProfitOrderPrice = (currentPrice * (1 + (config.trading.takeProfitPerc / 100))).toFixed(3);
    stopLossOrderPrice = (currentPrice * (1 - (config.trading.stopLossPerc / 100))).toFixed(3);
    positionOpen = 'long';
    handleOpenPosition();
  } else if (currentRSI <= config.indicators.rsi.shortValue &&
    !positionOpen &&
    !blockOpeningNewPosition) {
    // open short position
    takeProfitOrderPrice = (currentPrice * (1 - (config.trading.takeProfitPerc / 100))).toFixed(3);
    stopLossOrderPrice = (currentPrice * (1 + (config.trading.stopLossPerc / 100))).toFixed(3);
    positionOpen = 'short';
    handleOpenPosition();
  }
  console.log(`${new Date().toLocaleTimeString()} - RSI : ${currentRSI} @ ${currentPrice}`);
}
/**
 * Saves the current price into database
 */
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

/**
 * Fetches the balances from exchange via REST
 *
 * @returns
 */
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

bot.on('polling_error', (error) => {
  console.log(`Telegram Error - ${error.message}`);
  //  telegramOnline = false;
  //  bot.stopPolling();
});

ws.on('error', (err) => { console.log(err); });
ws.on('close', () => console.log('closed'));

ws.on('open', () => {
  ws.auth.bind(ws);
  console.log('Bitfinex Websocket open...');
  ws.subscribeCandles(CANDLE_KEY);
});

ws.onCandle({ key: CANDLE_KEY }, (candles) => {
  currentPrice = candles[0].close; // current candle close is most accurate price vs. ticker
  checkClosing();
  rsiCalculation(candles.map(x => x.close).reverse());
  savePriceToDb();
});

if (VERBOSE) {
  setInterval(() => {
    checkBalances();
    checkPositions();
  }, 10000);
}
ws.open();

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
