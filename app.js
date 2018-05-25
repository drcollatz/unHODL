process.env.NTBA_FIX_319 = 1; // needed for telegram issue

const config = require('./config');
const WebSocket = require('ws');

const BFX = require('bitfinex-api-node');

const { Order } = require('./node_modules/bitfinex-api-node/lib/models');

const { RSI } = require('technicalindicators');
const TelegramBot = require('node-telegram-bot-api');

const wsTickerEOS = new WebSocket('wss://api.bitfinex.com/ws/');
const wsCandles = new WebSocket('wss://api.bitfinex.com/ws/');

const bot = new TelegramBot(config.telegram.token, {
  polling: true,
});

let telegramOnline = true;
let currentPrice = '';
let currentRSI = '';
let takeProfitOrderPrice = '';
let stopLossOrderPrice = '';
let positionOpen = false;

bot.on('polling_error', (error) => {
  console.log(`Telegram Error - ${error.message}`);
  telegramOnline = false;
  bot.stopPolling();
});

if (telegramOnline) bot.sendMessage(config.telegram.chat, 'unHODL Bot started...');

const bfx = new BFX({
  apiKey: config.bitfinex.key,
  apiSecret: config.bitfinex.secret,
});

const bfxWS = bfx.ws(2);

bfxWS.on('error', (err) => { console.log(err); });
bfxWS.on('open', bfxWS.auth.bind(bfxWS));

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

// ws.open();

const Fields = Object.freeze({
  TIME: 0,
  OPEN: 1,
  CLOSE: 2,
  HIGH: 3,
  LOW: 4,
  VOLUME: 5,
});

const marketData = {
  timestamp: [],
  open: [],
  close: [],
  high: [],
  low: [],
  volume: [],
  time: [],
};

function addCandle(data) {
  if (marketData.length >= 200) { // Hold only 200 candles, pop the oldest data
    Object.keys(marketData).forEach((field) => {
      field.pop();
    });
  }
  marketData.timestamp.push(data[Fields.TIME]);
  marketData.open.push(data[Fields.OPEN]);
  marketData.close.push(data[Fields.CLOSE]);
  marketData.high.push(data[Fields.HIGH]);
  marketData.low.push(data[Fields.LOW]);
  marketData.volume.push(data[Fields.VOLUME]);

  // for debugging:
  const time = new Date(data[Fields.TIME]);
  marketData.time.push(String(`${time.getDate()} - ${time.getHours()}:${time.getMinutes()}`));
}

function updateCandle(data, index) {
  marketData.timestamp[index] = data[Fields.TIME];
  marketData.open[index] = data[Fields.OPEN];
  marketData.close[index] = data[Fields.CLOSE];
  marketData.high[index] = data[Fields.HIGH];
  marketData.low[index] = data[Fields.LOW];
  marketData.volume[index] = data[Fields.VOLUME];
}

function rsiCalculation() {
  const inputRSI = {
    values: marketData.close,
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

wsTickerEOS.on('open', () => {
  wsTickerEOS.send(JSON.stringify({
    event: 'subscribe',
    channel: 'ticker',
    pair: 'EOSUSD',
  }));
});

wsTickerEOS.on('message', (rawdata) => {
  const data = JSON.parse(rawdata);
  const hb = data[1];
  if (hb !== 'hb' && hb) {
    console.log(`${new Date().toLocaleTimeString()} - EOSUSD : ${hb}`);
    currentPrice = hb;
    if (positionOpen && !(currentPrice < Math.max(takeProfitOrderPrice, stopLossOrderPrice)
      && currentPrice > Math.min(takeProfitOrderPrice, stopLossOrderPrice))) {
      positionOpen = false;
      console.log(`Postition Closed @: ${currentPrice}`);
      if (telegramOnline) {
        bot.sendMessage(config.telegram.chat, `Postition Closed @: ${currentPrice}`);
      }
    }
  }
});

wsCandles.on('open', () => {
  wsCandles.send(JSON.stringify({
    event: 'subscribe',
    channel: 'candles',
    key: 'trade:1m:tEOSUSD',
  }));
});

wsCandles.on('message', (rawdata) => {
  const data = JSON.parse(rawdata);
  let candleData = '';
  if (Array.isArray(data) && data[1] !== 'hb') {
    [, candleData] = data;
    if (Array.isArray(candleData[0])) {
      candleData.reverse();
      candleData.forEach((element) => {
        if ((marketData.timestamp).indexOf(element[Fields.TIME]) === -1) {
          addCandle(element);
        }
      });
    } else {
      const index = (marketData.timestamp).indexOf(candleData[Fields.TIME]);
      if (index === -1) {
        addCandle(candleData);
        rsiCalculation();
      } else {
        updateCandle(candleData, index);
      }
    }
  }
});

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
} * /

/* const restExample = async () => {
  const balances = await bfxREST.balances(); // actual balance fetch
  const positions = await bfxREST.positions();
  console.log(balances);
  console.log(positions);
};

restExample(); */

// Variable nach 30 sek setzen:
// setTimeout(() => { rsiLocked = false; }, 30000);
