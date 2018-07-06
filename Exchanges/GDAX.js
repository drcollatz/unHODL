const ccxt = require('CCXT');
// const config = require('../conf/config');

let instance = null;
module.exports = class Exchange {
  constructor(startBalance) {
    if (!instance) {
      instance = this;
      this.currentBalance = startBalance;
      this.tradeCounterWin = 0;
      this.tradeCounterLost = 0;
    }
    return instance;
  }


  /**
     *
     *
     * @param {*} tradingPair
     */
  initCandleFetch(tradingPair, onCandleCallback) {
    tradingPair.candleKeys.forEach((candleKey) => {
      (async () => {
        const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
        const exchange = new ccxt.gdax();
        while (true) {
          await sleep(1000);
          const ohlcv = await exchange.fetchOHLCV('BTC/EUR', '1m');
          const map = new Map();
          map.set('key', 'candleUpdate');
          map.set('candleKey', candleKey);
          map.set('context', this);
          map.set('candles', ohlcv);
          onCandleCallback(map);
        }
      })();
    });
  }

  /**
   *
   *
   * @param {*} tradingPair
   */
  registerTradingPair(tradingPair, onCandleCallback) {
    this.initCandleFetch(tradingPair, onCandleCallback);
  }
};

