
const config = require('./conf/config');
const RSI = require('./indicators/RSI');
const { Position } = require('./Position');
const { Indicator } = require('./Indicator');

module.exports.TradingPair = class TradingPair {
  /**
 *
 *
 * @param {*} data
 */
  observerCallback(data) {
    const time = new Date().toLocaleTimeString();
    if (data.get('key') === 'candleUpdate') {
      const candles = data.get('candles');
      if (candles != null) {
        this.currentPrice = candles[0].close; // current candle close is more accurate then ticker
        this.indicators[Indicator.RSI] = RSI.rsiCalculation(candles.map(x => x.close).reverse());
        this.currentRSI = this.indicators[Indicator.RSI];
        const msg = `${time} - ${this.toString()}, RSI: ${this.indicators[Indicator.RSI].toFixed(3)} @ ${this.currentPrice.toFixed(3)}`;
        console.log(msg);
        // this.checkMarketSituation();
        this.tradeTriggers.forEach((tradeTrigger) => {
          if (tradeTrigger.checkTrigger()) {
            console.log('Condition is true!');
            if (this.activePosition == null) {
              this.activePosition = new Position(
                this,
                tradeTrigger.positionType,
                (config.trading.startBalance / this.currentPrice) * config.trading.margin,
                this.currentPrice,
                config.trading.takeProfitPerc,
                config.trading.stopLossPerc,
                this.trailing,
              );
              this.activePosition.open();
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
  constructor(exchange, candleKey, trailing) {
    // create array for all instanced pairs
    if (TradingPair.activePairs == null) {
      TradingPair.activePairs = [];
    }

    this.currentPrice = 0;
    this.currentRSI = 0;
    this.sumProfit = 0;
    this.indicators = [];
    this.tradeTriggers = [];

    this.indicators[Indicator.RSI] = 0;

    this.blockOpeningNewPosition = false;
    this.candleKey = candleKey;
    this.coin = candleKey.slice(-6, -3);
    this.trailing = trailing;

    this.observers = [];
    this.activePosition = null;

    this.exchange = exchange;
    if (exchange != null) {
      this.exchange.registerTradingPair(this, this.observerCallback.bind(this));
      TradingPair.activePairs.push(this);
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
     *
     *
     */
  checkMarketSituation() {
    if (
      this.activePosition == null &&
      this.blockOpeningNewPosition &&
      (this.currentRSI < config.indicators.rsi.longValue &&
        this.currentRSI > config.indicators.rsi.shortValue)
    ) {
      this.blockOpeningNewPosition = false;
    }

    if (
      this.currentRSI >= config.indicators.rsi.longValue &&
      this.activePosition == null &&
      !this.blockOpeningNewPosition
    ) {
      // open long position
      const newPos = new Position(
        this,
        'LONG',
        (config.trading.startBalance / this.currentPrice) * config.trading.margin,
        this.currentPrice,
        config.trading.takeProfitPerc,
        config.trading.stopLossPerc,
        this.trailing,
      );

      this.activePosition = newPos;
      this.blockOpeningNewPosition = true;
      newPos.open();
      const map = new Map();
      map.set('key', 'newPos');
      map.set('context', this);
      map.set('pos', newPos);
      this.broadcast(map);
    } else if (
      this.currentRSI <= config.indicators.rsi.shortValue &&
      this.activePosition == null &&
      !this.blockOpeningNewPosition
    ) {
      // open short position
      const newPos = new Position(
        this,
        'SHORT',
        (config.trading.startBalance / this.currentPrice) * config.trading.margin,
        this.currentPrice,
        config.trading.takeProfitPerc,
        config.trading.stopLossPerc,
        this.trailing,
      );

      this.activePosition = newPos;
      this.blockOpeningNewPosition = true;
      newPos.open();
      const map = new Map();
      map.set('key', 'newPos');
      map.set('context', this);
      map.set('pos', newPos);
      this.broadcast(map);
    }
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
      return console.log('no open positions');
    }
    console.log(`${new Date().toLocaleTimeString()} - Pos Amount: ${positions[0].amount}`);
    console.log(`${new Date().toLocaleTimeString()} - Pos P/L: ${positions[0].pl.toFixed(2)} (${positions[0].plPerc.toFixed(2)}%)`);
    this.amount = positions[0].amount;
    this.pl = positions[0].pl.toFixed(2);
    this.plPerc = positions[0].plPerc.toFixed(2);
    return true;
  }
};

// module.exports.LiveTradingPair = LiveTradingPair;
