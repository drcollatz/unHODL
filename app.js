process.env.NTBA_FIX_319 = 1; // needed for telegram issue

const config = require('./config');
const WebSocket = require('ws');

const { RSI } = require('technicalindicators');
const TelegramBot = require('node-telegram-bot-api');

const wsTicker = new WebSocket('wss://api.bitfinex.com/ws/');
const wsCandles = new WebSocket('wss://api.bitfinex.com/ws/');

//const bot = new TelegramBot(config.telegram.token, {
//  polling: true,
//});
  // bot.sendMessage(config.telegram.chat, "unHODL Bot started...");


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
  const rsiResultValue = rsiResultArray[rsiResultArray.length - 1];

  if ((rsiResultValue >= 70 || rsiResultValue <= 30) && bot) {
    bot.sendMessage(config.telegram.chat, `RSI: ' ${rsiResultValue}`);
  }
  console.log(`${new Date().toLocaleTimeString()} - RSI : ${rsiResultValue}`);
}

wsTicker.on('open', () => {
  wsTicker.send(JSON.stringify({
    event: 'subscribe',
    channel: 'ticker',
    pair: 'EOSUSD',
  }));
});

wsTicker.on('message', (rawdata) => {
  const data = JSON.parse(rawdata);
  const hb = data[1];
  if (hb !== 'hb' && hb) {
    console.log(`${new Date().toLocaleTimeString()} - EOSUSD : ${hb}`);
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
    candleData = data[1];
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

// Execute BFX API call

/* const BFX = require('bitfinex-api-node');
if (config.bitfinex.key !== '') {
  const bfx = new BFX({
    apiKey: config.bitfinex.key,
    apiSecret: config.bitfinex.secret
  })
  const rest = bfx.rest(2, {
    transform: true
  })
  rest.positions((err, res) => {
    if (err) console.log(err)
    console.log('Postition: ' + res[0].pl)
  });
} */
