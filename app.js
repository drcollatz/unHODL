const WebSocket = require('ws');
const BFX = require('bitfinex-api-node')
const RSI = require('technicalindicators').RSI;
const TelegramBot = require('node-telegram-bot-api');

const token = ''
const chatID = ''

const BFX_API_KEY = ''
const BFX_API_SECRET = ''

const ws_ticker = new WebSocket('wss://api.bitfinex.com/ws/');
const ws_candles = new WebSocket('wss://api.bitfinex.com/ws/');

var Fields = Object.freeze({TIME:0, OPEN: 1, CLOSE: 2, HIGH: 3, LOW: 4, VOLUME: 5});

if (token !== '') {
  const bot = new TelegramBot(token, {
    polling: true
  });
  bot.sendMessage(chatID, "RoxxBot started...");
}

var marketData = {
  timestamp: [],
  open: [],
  close: [],
  high: [],
  low: [],
  volume: [],
  time: []
};

ws_ticker.on('open', function open() {
  ws_ticker.send(JSON.stringify({
    event: 'subscribe',
    channel: 'ticker',
    pair: 'EOSUSD'
  }));
});

ws_ticker.on('message', function incoming(rawdata) {
  const data = JSON.parse(rawdata);
  const hb = data[1];
  if (hb !== 'hb' && hb) {
    console.log(`EOSUSD (Bitfinex): ${hb}`);
  }
});

ws_candles.on('open', function open() {
  ws_candles.send(JSON.stringify({
    event: 'subscribe',
    channel: 'candles',
    key: 'trade:1m:tEOSUSD'
  }));
});

function addData(data) {
  if (marketData.length >= 200) { // Hold only 200 candles, pop the oldest data if 200 candles are reached
    for (field in marketData) {
      field.pop();
    }
  }
  marketData.timestamp.push(data[Fields.TIME]);
  var time = new Date(data[Fields.TIME]);
  marketData.time.push(String(time.getDate() + ' - ' + time.getHours() + ':' + time.getMinutes()));
  marketData.open.push(data[Fields.OPEN]);
  marketData.close.push(data[Fields.CLOSE]);
  marketData.high.push(data[Fields.HIGH]);
  marketData.low.push(data[Fields.LOW]);
  marketData.volume.push(data[Fields.VOLUME]);  
}

ws_candles.on('message', function incoming(rawdata) {
  const data = JSON.parse(rawdata);
  if (Array.isArray(data) && data[1] !== 'hb') {
    if (Array.isArray(data[1][0])) {
      candles = data[1].reverse();
      candles.forEach(element => {
        if ((marketData.timestamp).indexOf(element[Fields.TIME]) === -1) {
          addData(element);
        }
      });
    } else {
      candle_data = data[1];
      var index = (marketData.timestamp).indexOf(candle_data[Fields.TIME]);
      if (index === -1) {
        addData(candle_data);
        var inputRSI = {
          values: marketData.close,
          period: 14
        };
  
        var rsiResult = RSI.calculate(inputRSI);
  
        if (rsiResult[rsiResult.length - 1] >= 70 && bot) {
          bot.sendMessage(chatID, "RSI: " + rsiResult[rsiResult.length - 1]);
        }
        console.log('RSI: ' + rsiResult[rsiResult.length - 1]);
      }
    }
  }
});


// Execute BFX API call
/* if (BFX_API_KEY !== '') {
  const bfx = new BFX({
    apiKey: BFX_API_KEY,
    apiSecret: BFX_API_SECRET
  })
  const rest = bfx.rest(2, {
    transform: true
  })
  rest.positions((err, res) => {
    if (err) console.log(err)
    console.log('Postition: ' + res[0].pl)
  });
} */