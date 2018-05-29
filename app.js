process.env.NTBA_FIX_319 = 1; // needed for telegram issue

const config = require('./config');

const BFX = require('bitfinex-api-node');

const bfx = new BFX({
  apiKey: config.bitfinex.key,
  apiSecret: config.bitfinex.secret,
  ws: {
    autoReconnect: true,
    seqAudit: true,
    packetWDDelay: 10 * 1000,
  },
});

const CANDLE_KEY = 'trade:1m:tEOSUSD';

const { RSI } = require('technicalindicators');

const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(config.telegram.token, {
  polling: true,
});

const mongoose = require('mongoose');

const Price = require('./models/price');

const telegramOnline = true;
let currentPrice = '';
let currentRSI = '';
let takeProfitOrderPrice = '';
let stopLossOrderPrice = '';
let positionOpen = false;

mongoose.connect('mongodb+srv://unhodl:4y8xktwaoTxNQxUy@unhodl-db-eadeo.mongodb.net/test?retryWrites=true');

bot.on('polling_error', (error) => {
  console.log(`Telegram Error - ${error.message}`);
  //  telegramOnline = false;
  //  bot.stopPolling();
});

if (telegramOnline) bot.sendMessage(config.telegram.chat, 'unHODL Bot started...');

function checkClosing() {
  if (positionOpen && !(currentPrice < Math.max(takeProfitOrderPrice, stopLossOrderPrice)
    && currentPrice > Math.min(takeProfitOrderPrice, stopLossOrderPrice))) {
    positionOpen = false;
    console.log(`Postition Closed @: ${currentPrice}`);
    if (telegramOnline) {
      bot.sendMessage(config.telegram.chat, `Postition Closed @: ${currentPrice}`);
    }
  }
}

function rsiCalculation(closeData) {
  const inputRSI = {
    values: closeData,
    period: 14,
  };
  const rsiResultArray = RSI.calculate(inputRSI);
  currentRSI = rsiResultArray[rsiResultArray.length - 1];

  if (currentRSI >= 70 && !positionOpen) {
    takeProfitOrderPrice = (currentPrice * 1.006).toFixed(3);
    stopLossOrderPrice = (currentPrice * 0.99).toFixed(3);
    positionOpen = true;
    const msg = `${new Date().toLocaleTimeString()} - RSI: ' ${currentRSI} @ ${currentPrice} (TP: ${takeProfitOrderPrice})(SL: ${stopLossOrderPrice}`;
    console.log(msg);
    console.log('Postition opened');
    if (telegramOnline) {
      bot.sendMessage(config.telegram.chat, msg);
    }
  } else if (currentRSI <= 30 && !positionOpen) {
    takeProfitOrderPrice = (currentPrice * 0.994).toFixed(3);
    stopLossOrderPrice = (currentPrice * 1.01).toFixed(3);
    positionOpen = true;
    const msg = `${new Date().toLocaleTimeString()} - RSI: ' ${currentRSI} @ ${currentPrice} (TP: ${takeProfitOrderPrice})(SL: ${stopLossOrderPrice}`;
    console.log(msg);
    console.log('Postition opened');
    if (telegramOnline) {
      bot.sendMessage(config.telegram.chat, msg);
    }
  }
  console.log(`${new Date().toLocaleTimeString()} - RSI : ${currentRSI} @ ${currentPrice}`);
}

function savePriceToDb() {
  const price = new Price({
    _id: new mongoose.Types.ObjectId(),
    pair: 'EOSUSD',
    time: new Date().toLocaleTimeString(),
    price: currentPrice,
  });

  price.save((err) => {
    if (err) {
      return console.log(err);
    }
    return true;
  });
}

const ws = bfx.ws(2, {
  manageCandles: true, // enable candle dataset persistence/management
  transform: true, // converts ws data arrays to Candle models (and others)
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

  const restExample = async () => {
  const balances = await bfxREST.balances(); // actual balance fetch
  const positions = await bfxREST.positions();
  console.log(balances);
  console.log(positions);
};

restExample();

// Variable nach 30 sek setzen:
// setTimeout(() => { rsiLocked = false; }, 30000);

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
