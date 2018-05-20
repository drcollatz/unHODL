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

ws_candles.on('message', function incoming(rawdata) {
  const data = JSON.parse(rawdata);
  if (Array.isArray(data) && data[1] !== 'hb') {
    if (Array.isArray(data[1][0])) {
      data[1].forEach(element => {
        if ((marketData.timestamp).indexOf(element[0]) === -1) {
          marketData.timestamp.push(element[0]);
          var time = new Date(element[0]);
          marketData.time.push(String(time.getDate() + ' - ' + time.getHours() + ':' + time.getMinutes()));
          marketData.open.push(element[1]);
          marketData.close.push(element[2]);
          marketData.high.push(element[3]);
          marketData.low.push(element[4]);
          marketData.volume.push(element[5]);
        }
      });
      marketData.time = marketData.time.reverse();
      marketData.open = marketData.open.reverse();
      marketData.close = marketData.close.reverse();
      marketData.high = marketData.high.reverse();
      marketData.low = marketData.low.reverse();
      marketData.volume = marketData.volume.reverse();
    } else {
      var index = (marketData.timestamp).indexOf(data[1][0]);
      if (index === -1) {
        marketData.timestamp.push(data[1][0]);
        var time = new Date(data[1][0]);
        marketData.time.push(String(time.getDate() + ' - ' + time.getHours() + ':' + time.getMinutes()));
        marketData.open.push(data[1][1]);
        marketData.close.push(data[1][2]);
        marketData.high.push(data[1][3]);
        marketData.low.push(data[1][4]);
        marketData.volume.push(data[1][5]);
      } else {
        marketData.timestamp[index] = data[1][0];
        var time = new Date(data[1][0]);
        marketData.time.push(String(time.getDate() + ' - ' + time.getHours() + ':' + time.getMinutes()));
        marketData.open[index] = data[1][1];
        marketData.close[index] = data[1][2];
        marketData.high[index] = data[1][3];
        marketData.low[index] = data[1][4];
        marketData.volume[index] = data[1][5];
      }

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