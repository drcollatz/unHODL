const config = require('./conf/config');
const logger = require('./node_modules/js-logger');
const { Position } = require('./Position');
const { Indicator } = require('./Indicator');

module.exports.TradingPair = class TradingPair {
  /**
 *
 *
 * @param {*} data
 */
  observerCallback(data) {
    if (data.get('key') === 'candleUpdate') {
      const candles = data.get('candles');
      if (candles != null) {
        this.indicatorMap.forEach((candleKey, indicator) => {
          if (candleKey === data.get('candleKey')) {
            this.indicators[indicator] = Indicator.calc(indicator, candles);
          }
        });
        this.currentRSI = this.indicators[Indicator.RSI];
        const interval = data.get('candleKey').slice(6, 7);
        let diffPrice;
        if (interval === '1') {
          this.currentPrice = candles[0].close; // current candle (1m interval) close is more accurate then ticker
        }
        const time = new Date().toLocaleTimeString();
        const strTime = `${time} - Candle interval: ${interval} of ${this.toString()},`;
        let strIndicator = '';
        this.indicatorMap.forEach((candleKey, indicator) => {
          strIndicator += ` | ${Indicator.toString(indicator)}: ${this.indicators[indicator].toFixed(3)}`;
          diffPrice = (this.indicators[indicator] > this.currentPrice) ? `${(this.indicators[indicator] - this.currentPrice).toFixed(3)} (SHORT TREND)` : `${(this.currentPrice - this.indicators[indicator]).toFixed(3)} (LONG TREND)`;
        });
        const strPrice = ` @ ${this.currentPrice.toFixed(3)} USD`;
        logger.info(`${strTime + strIndicator + strPrice} | Diff: ${diffPrice}`);
        this.tradeTriggers.forEach((tradeTrigger) => {
          if (tradeTrigger.checkTrigger()) {
            logger.debug('Condition is true!');
            if (this.activePosition == null && this.currentPrice !== 0) {
              this.activePosition = new Position(
                this,
                tradeTrigger.positionType,
                (this.exchange.currentBalance / this.currentPrice) * config.trading.margin,
                this.currentPrice,
                config.trading.takeProfitPerc,
                config.trading.stopLossPerc,
                this.trailing,
              );
              if (config.trading.enabled) {
                this.activePosition.open();
              }
              const map = new Map();
              map.set('key', 'newPos');
              map.set('context', this);
              map.set('pos', this.activePosition);
              this.broadcast(map);
            }
          }
        });
        if (this.activePosition != null) {
          this.activePosition.update();
        }
      }
    }
  }
  constructor(exchange, indicatorMap, trailing) {
    // create array for all instanced pairs
    if (TradingPair.activePairs == null) {
      TradingPair.activePairs = [];
    }

    this.currentPrice = 0;
    this.currentRSI = 0;
    this.sumProfit = 0;
    this.indicators = [];
    this.tradeTriggers = [];
    this.candleKeys = [];
    this.coin = '';

    this.indicatorMap = indicatorMap;
    this.indicatorMap.forEach((candleKey, indicator) => {
      if (candleKey.includes(this.coin) || this.coin === '') {
        if (this.candleKeys.indexOf(candleKey) === -1) {
          this.candleKeys.push(candleKey);
        }
        if (this.coin === '') {
          this.coin = candleKey.slice(-6, -3);
        }
      } else {
        throw Promise.reject(new Error('Only a candlekey of the same coin can be added!'));
      }

      this.indicators[indicator] = 0;
    });

    this.trailing = trailing;

    this.observers = [];
    this.activePosition = null;

    this.exchange = exchange;
  }

  goLive() {
    if (this.exchange != null) {
      this.exchange.registerTradingPair(this, this.observerCallback.bind(this));
      TradingPair.activePairs.push(this);
    } else {
      throw Promise.reject(new Error('No Exchange object was provided!'));
    }
  }

  getValueForIndicator(indicator) {
    return this.indicators[indicator];
  }

  addTrigger(tradeTrigger) {
    this.tradeTriggers.push(tradeTrigger);
  }
  /**
     *
     *
     * @returns
     */
  toString() {
    return `${this.coin}`;
  }
  /**
     *
     *
     * @param {*} fn
     */
  subscribe(fn) {
    this.observers.push(fn);
  }
  /**
     *
     *
     * @param {*} fn
     */
  unsubscribe(fn) {
    this.observers = this.observers.filter(subscriber => subscriber !== fn);
  }
  /**
     *
     *
     * @param {*} data
     */
  broadcast(data) {
    this.observers.forEach(subscriber => subscriber(data));
  }
  /**
     * Summarize profit of the trading pair
     *
     * @param {*} profit
     */
  addProfit(profit) {
    this.sumProfit += profit;
  }

  /**
     *
     *
     * @param {*} closedPosition
     */
  onPositionClosed(closedPosition) {
    this.sumProfit += closedPosition.profit;
    this.activePosition = null;
    const map = new Map();
    map.set('key', 'closedPos');
    map.set('context', this);
    map.set('pos', closedPosition);
    this.broadcast(map);
  }
  /**
     * Fetches the positions data from exchange via REST
     * CURRENTLY ONLY ONE PAIR!!!
     *
     * @returns
     */
  async checkPositions() {
    const positions = await this.rest.positions();

    if (positions.length === 0) {
      return logger.info('no open positions');
    }
    logger.info(`${new Date().toLocaleTimeString()} - Pos Amount: ${positions[0].amount}`);
    logger.info(`${new Date().toLocaleTimeString()} - Pos P/L: ${positions[0].pl.toFixed(2)} (${positions[0].plPerc.toFixed(2)}%)`);
    this.amount = positions[0].amount;
    this.pl = positions[0].pl.toFixed(2);
    this.plPerc = positions[0].plPerc.toFixed(2);
    return true;
  }
};

// module.exports.LiveTradingPair = LiveTradingPair;
