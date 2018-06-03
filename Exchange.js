const BFX = require('bitfinex-api-node');
const config = require('./config');

const RSI = require('./RSI.js');
const Position = require('./Position.js');
const Database = require('./Database.js');

module.exports = class LiveTradingPair {
  constructor(candleKey, trailing) {
    // create array for all instanced pairs
    if (LiveTradingPair.activePairs == null) {
      LiveTradingPair.activePairs = [];
    }
    this.currentPrice = 0;
    this.currentRSI = 0;
    this.sumProfit = 0;

    this.blockOpeningNewPosition = false;
    this.candleKey = candleKey;
    this.coin = candleKey.slice(-6, -3);
    this.trailing = trailing;

    this.observers = [];
    this.activePosition = null;

    this.bfx = new BFX({
      apiKey: config.bitfinex.key,
      apiSecret: config.bitfinex.secret,
      ws: {
        autoReconnect: true,
        seqAudit: true,
        packetWDDelay: 10 * 1000,
      },
    });

    this.ws = this.bfx.ws(2, {
      manageCandles: true, // enable candle dataset persistence/management
      transform: true, // converts ws data arrays to Candle models (and others)
    });

    this.rest = this.bfx.rest(2, {
      transform: true,
    });

    this.initWebSocket(this.candleKey);
  }
  /**
   *
   *
   * @returns
   */
  toString() {
    return `TradingPair with key ${this.candleKey}`;
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
   * @param {*} candleKey
   */
  initWebSocket(candleKey) {
    this.ws.on('error', (err) => {
      console.log(err);
    });
    this.ws.on('close', () => console.log('closed'));

    this.ws.on('open', () => {
      this.ws.auth.bind(this.ws);
      this.ws.subscribeCandles(candleKey);
      const msg = `Class ${this.constructor.name}: Websocket opened for ${candleKey}`;
      console.log(msg);
    });

    LiveTradingPair.activePairs.push(this);
    this.ws.onCandle({ key: candleKey }, (candles) => {
      this.currentPrice = candles[0].close; // current candle close is more accurate then ticker
      this.currentRSI = RSI.rsiCalculation(candles.map(x => x.close).reverse());
      const map = new Map();
      map.set('key', 'candleUpdate');
      map.set('context', this);
      map.set('price', this.currentPrice);
      map.set('RSI', this.currentRSI);
      this.broadcast(map);
      this.checkMarketSituation();
      Database.savePriceToDb(this.currentPrice);
      if (this.activePosition != null) {
        this.activePosition.update();
      }
    });

    this.ws.open();
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
        'long',
        0.1,
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
        'short',
        0.1,
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
