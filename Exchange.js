const config = require('./conf/config');
const logger = require('./node_modules/js-logger');
const BFX = require('bitfinex-api-node');


let instance = null;

module.exports = class Exchange {
  constructor(inApiKey, inApiSecret) {
    if (!instance) {
      instance = this;
      this.currentBalance = 0;
      this.currentPL = 0;
      this.currentPL_Perc = 0;
      this.startBalance = 0;
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
        logger.warn(`WARING: ${err}`);
      });

      this.ws.on('close', () => {
        const time = new Date().toLocaleTimeString();
        logger.info(`${time} - Websocket closed`);
      });

      this.ws.on('auth', () => {
        const time = new Date().toLocaleTimeString();
        logger.info(`${time} - Authenticated!`);
        this.ws.notifyUI({
          type: 'success',
          message: 'unHODL successfulliy authenticated!',
        });
      });

      this.ws.on('open', () => {
        const time = new Date().toLocaleTimeString();
        this.ws.auth.bind(this.ws); // ??
        this.ws.auth();
        tradingPair.candleKeys.forEach((candleKey) => {
          this.ws.subscribeCandles(candleKey);
          logger.info(`${time} - Websocket opened for ${candleKey}`);
        });
      });

      setInterval(() => {
        this.ws.requestCalc([
          'position_tEOSUSD',
        ]);
      }, 1000);

      this.ws.onWalletSnapshot({}, (ws) => {
        const time = new Date().toLocaleTimeString();
        if (config.trading.enabled) {
          this.startBalance = ws[ws.length - 1].balance; // last element seems to be the margin wallet
        } else this.startBalance = config.trading.startBalance;
        this.currentBalance = this.startBalance;
        logger.info(`${time} - Start Balance in margin wallet: ${this.startBalance} USD`);
      });

      this.ws.onWalletUpdate({}, (wu) => {
        const time = new Date().toLocaleTimeString();
        logger.debug('wu.onWalletUpdate');
        // logger.debug(wu);
        if (config.trading.enabled && (wu.type === 'margin')) {
          this.currentBalance = wu.balance;
          logger.info(`${time} - Margin Wallet Balance updated: ${wu.balance} ${wu.currency}`);
        }
      });

      this.ws.onPositionSnapshot({ symbol: 'tEOSUSD' }, (ps) => {
        logger.debug(ps);
      });

      this.ws.onPositionUpdate({}, (pu) => {
        const time = new Date().toLocaleTimeString();
        // logger.debug('ws.onPositionUpdate');
        // logger.debug(pu);
        if (this.currentPL !== pu.pl) {
          this.currentPL = pu.pl;
          this.currentPL_Perc = pu.plPerc;
          logger.info(`${time} - Current Profit/Loss: ${pu.pl} (${pu.plPerc} %)`);
        }
      });

      this.ws.onMarginInfoUpdate({}, (miu) => {
        logger.debug('ws.onMarginInfoUpdate');
        logger.debug(miu);
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
        logger.error(`Websocket ${this.ws.constructor.name} already opened -> Skipping...`);
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
