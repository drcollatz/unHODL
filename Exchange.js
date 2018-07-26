const BFX = require('bitfinex-api-node');

let instance = null;
module.exports = class Exchange {
  constructor(inApiKey, inApiSecret, startBalance) {
    if (!instance) {
      instance = this;
      this.currentBalance = startBalance;
      this.tradeCounterWin = 0;
      this.tradeCounterLost = 0;

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

      this.ws.on('auth', () => {
        console.log('authenticated!');
      });

      this.ws.on('open', () => {
        this.ws.auth.bind(this.ws); // ??
        this.ws.auth();
        tradingPair.candleKeys.forEach((candleKey) => {
          this.ws.subscribeCandles(candleKey);
          const msg = `Class ${this.constructor.name}: Websocket opened for ${candleKey}`;
          console.log(msg);
        });
      });

      this.ws.onPositionSnapshot({ symbol: 'tEOSUSD' }, (pos) => {
        console.log(pos);
      });

      tradingPair.candleKeys.forEach((candleKey) => {
        this.ws.onCandle({ key: candleKey }, (candles) => {
          const map = new Map();
          map.set('key', 'candleUpdate');
          map.set('candleKey', candleKey);
          map.set('context', this);
          map.set('candles', candles);
          onCandleCallback(map);
          // Database.savePriceToDb(this.currentPrice);
        });
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
