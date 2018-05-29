process.env.NTBA_FIX_319 = 1; // needed for telegram issue

const config = require('./config');

const BFX = require('bitfinex-api-node');
const { Order } = require('./node_modules/bitfinex-api-node/lib/models');

const { RSI } = require('technicalindicators');
const TelegramBot = require('node-telegram-bot-api');

const mongoose = require('mongoose');

const bot = new TelegramBot(config.telegram.token, {
  polling: true,
});

const CANDLE_KEY = 'trade:1m:tEOSUSD';

const Price = require('./models/price');

const telegramOnline = false;
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

ws.on('error', (err) => { console.log(err); });
ws.on('open', ws.auth.bind(ws));
ws.on('close', () => console.log('closed'));

ws.on('open', () => {
  console.log('open');
  ws.subscribeTicker('tEOSUSD');
  ws.subscribeCandles(CANDLE_KEY);
});

ws.onTicker({ symbol: 'tEOSUSD' }, (ticker) => {
  console.log('EOS/USD ticker: %j', ticker.lastPrice);
});

let candleArray = [];

// 'candles' here is an array
ws.onCandle({ key: CANDLE_KEY }, (candles) => {
  console.log('CANDLE ist da...');
  const candleClose = ws.getCandles(CANDLE_KEY).filter((val) => {
    val.filter((innerVal, index) => {
      if (index === 1) return innerVal;
    });
  });
//  const candleClose = ws.getCandles(CANDLE_KEY).map(x => x[2]);
});

ws.open();

/* bfxWS.once('auth', () => {
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
}); */

// ws.open();

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

/* wsTickerEOS.addEventListener('open', () => {
  console.log('wsTicker Socket openend...');
  wsTickerEOS.send(JSON.stringify({
    event: 'subscribe',
    channel: 'ticker',
    pair: 'EOSUSD',
  }));
});

wsTickerEOS.addEventListener('close', () => {
  console.log('Connection lost, try to reconnect...');
});

wsTickerEOS.addEventListener('error', () => {
  console.log('Error occurs, try to reconnect...');
});

wsTickerEOS.addEventListener('message', (rawdata) => {
  const data = JSON.parse(rawdata.data);
  const hb = data[1];
  if (hb !== 'hb' && hb) {
    console.log(`${new Date().toLocaleTimeString()} - EOSUSD : ${hb}`);
    currentPrice = hb;
    const price = new Price({
      _id: new mongoose.Types.ObjectId(),
      pair: 'EOSUSD',
      time: new Date().toLocaleTimeString(),
      price: currentPrice,
    });
    price.save(function (err) {
      if (err) return handleError(err);
    });

    // a<x==x<b testen
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

wsCandles.addEventListener('open', () => {
  wsCandles.send(JSON.stringify({
    event: 'subscribe',
    channel: 'candles',
    key: 'trade:1m:tEOSUSD',
  }));
});

wsCandles.addEventListener('close', () => {
  console.log('Connection lost, try to reconnect...');
});

wsCandles.addEventListener('message', (rawdata) => {
  const data = JSON.parse(rawdata.data);
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
      //  rsiCalculation();
        console.log('New Candle Added...')
      } else {
        updateCandle(candleData, index);
        rsiCalculation();
      }
    }
  }
}); */

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
