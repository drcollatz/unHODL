const BFX = require('bitfinex-api-node');
const config = require('./config');


let instance = null;

module.exports = class Exchange {
  constructor(inApiKey, inApiSecret) {
    if (!instance) {
      instance = this;

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
      this.ws = this.bfx.ws(2, {
        manageCandles: true, // enable candle dataset persistence/management
        transform: true, // converts ws data arrays to Candle models (and others)
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
    if (this.ws != null) {
      this.ws.on('error', (err) => {
        console.log(err);
      });
      this.ws.on('close', () => console.log('closed'));

      this.ws.on('open', () => {
        this.ws.auth.bind(this.ws);
        this.ws.subscribeCandles(tradingPair.candleKey);
        const msg = `Class ${this.constructor.name}: Websocket opened for ${tradingPair.candleKey}`;
        console.log(msg);
      });

      this.ws.onCandle({ key: tradingPair.candleKey }, (candles) => {
        const map = new Map();
        map.set('key', 'candleUpdate');
        map.set('context', this);
        map.set('candles', candles);
        onCandleCallback(map);
        // Database.savePriceToDb(this.currentPrice);
      });

      this.ws.open().catch(() => {
        console.log(`Websocket ${this.ws.constructor.name} already opened -> Skipping...`);
      });
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
