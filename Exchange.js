const BFX = require('bitfinex-api-node');
const config = require('./conf/config');


let instance = null;

module.exports = class Exchange {
  constructor(inApiKey, inApiSecret) {
    if (!instance) {
      instance = this;
      this.ws = [];

      this.bfx = new BFX({
        apiKey: inApiKey,
        apiSecret: inApiSecret,
        ws: {
          autoReconnect: true,
          seqAudit: true,
          packetWDDelay: 10 * 1000,
        },
      });

      this.rest = this.bfx.rest(2, {
        transform: true,
      });
    }
    return instance;
  }


  /**
     *
     *
     * @param {*} tradingPair
     */
  initWebSocket(tradingPair, onCandleCallback) {
    const newWs = this.bfx.ws(2, {
      manageCandles: true, // enable candle dataset persistence/management
      transform: true, // converts ws data arrays to Candle models (and others)
    });
    if (newWs != null) {
      this.ws.push(newWs);

      newWs.on('error', (err) => {
        console.log(err);
      });
      newWs.on('close', () => console.log('closed'));

      newWs.on('open', () => {
        newWs.auth.bind(newWs);
        newWs.subscribeCandles(tradingPair.candleKey);
        const msg = `Class ${this.constructor.name}: Websocket opened for ${tradingPair.candleKey}`;
        console.log(msg);
      });

      newWs.onCandle({ key: tradingPair.candleKey }, (candles) => {
        const map = new Map();
        map.set('key', 'candleUpdate');
        map.set('context', this);
        map.set('candles', candles);
        onCandleCallback(map);
        // Database.savePriceToDb(this.currentPrice);
      });

      newWs.open();
    }
  }

  /**
   *
   *
   * @param {*} tradingPair
   */
  registerTradingPair(tradingPair, onCandleCallback) {
    this.initWebSocket(tradingPair, onCandleCallback);
  }
};
