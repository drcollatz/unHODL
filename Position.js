const config = require('./conf/config');
const logger = require('./node_modules/js-logger');
const { Indicator } = require('./Indicator');
const { Order } = require('./node_modules/bfx-api-node-models/lib');

const PositionType = {
  LONG: 0,
  SHORT: 1,

  toString() {
    return this.LONG ? 'LONG' : 'SHORT';
  },
};
module.exports.PositionType = PositionType;

module.exports.Position = class Position {
  constructor(pair, type, amount, orderPrice, takeProfitPerc, stopLossPerc, doTrailing) {
    this.pair = pair;
    this.type = type;
    this.amount = amount;
    this.orderPrice = orderPrice;
    this.closingPrice = 0;
    this.takeProfitPerc = takeProfitPerc;
    this.stopLossPerc = stopLossPerc;
    this.startTime = new Date();
    this.period = new Date();
    this.debounce = 0;

    if (this.type === PositionType.LONG) {
      this.takeProfitPrice = (this.orderPrice * (1 + (this.takeProfitPerc / 100)));
      this.takeProfitBasePrice = this.takeProfitPrice;
      this.stopLossPrice = (this.orderPrice * (1 - (this.stopLossPerc / 100)));
    } else if (this.type === PositionType.SHORT) {
      this.takeProfitPrice = (this.orderPrice * (1 - (this.takeProfitPerc / 100)));
      this.takeProfitBasePrice = this.takeProfitPrice;
      this.stopLossPrice = (this.orderPrice * (1 + (this.stopLossPerc / 100)));
    }

    this.doTrailing = doTrailing;
    this.profitTrailing = false;
    this.stopLossBasePrice = this.orderPrice;
    // this.takeProfitBasePrice = this.orderPrice;
    this.profit = 0;

    this.openPosOrder = new Order({
      cid: Date.now(),
      symbol: 'tEOSUSD',
      amount: (this.type === PositionType.LONG) ? amount : -amount,
      type: Order.type.MARKET,
    }, pair.exchange.ws);

    this.stopLossOrder = new Order({
      cid: Date.now() + 1,
      symbol: 'tEOSUSD',
      amount: (this.type === PositionType.LONG) ? -amount : amount,
      price: this.stopLossPrice,
      type: Order.type.STOP,
    }, pair.exchange.ws);

    // Enable automatic updates
    this.openPosOrder.registerListeners();
    this.stopLossOrder.registerListeners();

    this.openPosOrder.on('update', () => {
      const time = new Date().toLocaleTimeString();
      logger.debug(`${time} - OPEN POSITION ORDER UPDATE - ID: ${this.openPosOrder.id} \
Type: ${this.openPosOrder.toPreview().type} Status: ${this.openPosOrder.status}`);
    });

    this.stopLossOrder.on('update', () => {
      const time = new Date().toLocaleTimeString();
      logger.debug(`${time} - SL ORDER UPDATE - ID: ${this.stopLossOrder.id} \
Type: ${this.stopLossOrder.toPreview().type} Status: ${this.stopLossOrder.status} Price: ${this.stopLossOrder.price}`);
    });

    this.stopLossOrder.on('close', () => {
      const time = new Date().toLocaleTimeString();
      logger.info(`${time} - SL ORDER IS CLOSED`);
      this.close();
      this.pair.onPositionClosed(this);
    });

    // Open Position Executed -> Set Stop Loss
    this.openPosOrder.on('close', () => {
      const time = new Date().toLocaleTimeString();
      logger.info(`${time} - OPEN POSITION ORDER CLOSED - ID: ${this.openPosOrder.id} Type: ${this.openPosOrder.toPreview().type} Status: ${this.openPosOrder.status}`);
      if (this.openPosOrder.status !== 'CANCELED') {
        logger.debug(`${time} - OPEN POSITION ORDER AVG PRICE: ${this.openPosOrder.priceAvg}`);
        // set Take Profit Price according to open position average price
        this.takeProfitPrice = this.openPosOrder.priceAvg * ((this.type === PositionType.LONG) ? (1 + (this.takeProfitPerc / 100)) : (1 - (this.takeProfitPerc / 100)));
        logger.debug(`${time} - TAKE PROFIT PRICE: ${this.takeProfitPrice}`);
        this.stopLossOrder.submit().then(() => {
          logger.info(`${time} - SL ORDER PLACED - ID: ${this.stopLossOrder.id} Type: ${this.stopLossOrder.toPreview().type} Status: ${this.stopLossOrder.status}`);
          this.stopLossOrder.update(); // need to update since SHORT is indicating status == null !?
        });
      }
    });
  }

  toString() {
    const posType = this.type === PositionType.SHORT ? '\u{1F4C9}' : '\u{1F4C8}';
    const closeResult = (this.profit > 0) ? '\u{1F44D}' : '\u{1F44E}';
    const trailing = (this.doTrailing) ? 'ON' : 'OFF';
    const balanceDiff = ((this.pair.exchange.currentBalance - this.pair.exchange.startBalance) / this.pair.exchange.startBalance) * 100;

    this.period = new Date() - this.startTime;
    const duration = `\nDuration = ${Math.floor(this.period / 1000 / 60)} min`;

    const amount = `\`Amount   = ${(this.amount).toFixed(3)} ${this.pair}`;
    let strIndicator = '';
    this.pair.indicatorMap.forEach((candleKey, indicator) => {
      strIndicator += `\n${Indicator.toString(indicator)}      = ${this.pair.indicators[indicator].toFixed(3)}`;
    });

    const stats = `\nTP       = ${(this.takeProfitPrice).toFixed(3)} USD (${config.trading.takeProfitPerc}%)\
                   \nSL       = ${(this.stopLossPrice).toFixed(3)} USD (${config.trading.stopLossPerc}%)\
                   \nTrailing = ${trailing}\
                   \nBalance  = ${(this.pair.exchange.currentBalance).toFixed(2)} USD (${balanceDiff.toFixed(2)} %) \
                   \nFee      = ${((this.pair.exchange.currentBalance * config.trading.margin) * 0.002).toFixed(4)} USD \
                   \nTrades   = ${this.pair.exchange.tradeCounterWin} \u{1F44D} / ${this.pair.exchange.tradeCounterLost} \u{1F44E}\``;


    const close = `${posType} \u{1F534} @ ${this.closingPrice.toFixed(3)} USD (${(this.profit).toFixed(2)} %) ${closeResult}\
                   \n\`----------------------\`\n${amount}${strIndicator}${duration}${stats}`;

    const open = `${posType} \u{1F195} @ ${this.orderPrice.toFixed(3)} USD \
                   \n\`----------------------\`\n${amount}${strIndicator}${stats}`;
    return this.closingPrice ? close : open;
  }

  open() {
    this.openPosOrder.submit().then(() => {
      const time = new Date().toLocaleTimeString();
      logger.info(`${time} - OPEN ORDER SUBMITTED - ID: ${this.openPosOrder.id}`);
    });
  }

  close() {
    // Calc profit in % for now, calc profit for short as positive
    this.profit = (((((this.pair.currentPrice - this.orderPrice) / this.orderPrice) * 100) * config.trading.margin));
    if (this.type === PositionType.SHORT) {
      this.profit *= -1;
    }
    this.profit -= config.trading.fee;
    this.pair.exchange.currentBalance *= 1 + (this.profit / 100);
    this.closingPrice = this.pair.currentPrice;
    this.period = Date.now() - this.startTime;
    if (this.profit > 0) {
      this.pair.exchange.tradeCounterWin += 1;
    } else {
      this.pair.exchange.tradeCounterLost += 1;
    }
  }

  update() {
    this.profit = (this.amount * this.pair.currentPrice) - (this.amount * this.orderPrice);
    if (this.checkClosing()) {
      this.close();
      this.pair.onPositionClosed(this);
    }

    if (this.doTrailing) {
      // this.updateTakeProfit();
      this.updateStopLoss();
    }
  }

  /**
   * Checks if the position closing conditions are met.
   */
  checkClosing() {
    let ret = false;
    if (
      (this.type === PositionType.LONG &&
        (/* this.pair.currentPrice >= this.takeProfitPrice || */
          this.pair.currentPrice <= this.stopLossPrice)) ||
      (this.type === PositionType.SHORT &&
        (/* this.pair.currentPrice <= this.takeProfitPrice || */
          this.pair.currentPrice >= this.stopLossPrice))
    ) {
      ret = true;
    }
    return ret;
  }

  /**
   * Trailing of stop loss limit if profit increase
   */
  updateStopLoss() {
/*     logger.debug(`Type: ${this.type}\
    \nCurrent Price: ${this.pair.currentPrice}\
    \nTake Profit Price: ${this.takeProfitPrice}\
    \nTake Profit Base Price: ${this.takeProfitBasePrice}\
    \nStopp Loss Price: ${this.stopLossPrice}\
    \nStopp Loss Order ID: ${this.stopLossOrder.id}\
    \nStopp Loss Order Status: ${this.stopLossOrder.status}\
    \nStopp Loss Order Price: ${this.stopLossOrder.price}\
    \nTrailing: ${this.profitTrailing}`); */
    this.period = new Date() - this.startTime;
    const time = new Date().toLocaleTimeString();
    // logger.debug(`Duration: ${Math.floor(this.period / 1000 / 60)} min`);
    // LONG: Price first time at/over take profit -> set SL Order on current price & set next goal (takeProfitBasePrice) for price & trailing ON
    if (!this.profitTrailing) {
      logger.debug(`${time} - Trailing NOT active...`);
      if (this.type === PositionType.LONG) {
        logger.debug(`${time} - LONG Position...`);
        logger.debug(`${time} - PL: ${this.pair.exchange.currentPL} (${this.pair.exchange.currentPL_Perc} %)`);
        if (this.pair.exchange.currentPL_Perc > 0.15) { // (this.pair.currentPrice > this.takeProfitPrice) {
          logger.debug(`${time} - TP (${this.takeProfitPrice.toFixed(3)}) price REACHED... (try to save profits, enabling trailing)`);
          this.stopLossPrice = this.pair.currentPrice * 0.9999;
          this.takeProfitBasePrice = this.pair.currentPrice * (1 + (this.stopLossPerc / 100));
          this.profitTrailing = true;
          if (this.stopLossOrder.status === 'ACTIVE' && config.trading.enabled) {
            logger.debug(`${time} - Trading is ENABLED: Adjusting SL order on exchange...`);
            this.stopLossOrder.update({ price: this.stopLossPrice });
            logger.info(`${time} - CP (${this.pair.currentPrice.toFixed(3)}) reached TP (${this.takeProfitPrice.toFixed(3)}) -> Update SL to ${this.stopLossPrice.toFixed(3)}, next goal at TPB: ${this.takeProfitBasePrice.toFixed(3)}`);
          }
        } else if (this.pair.currentPrice <= this.takeProfitPrice) {
          logger.debug(`${time} - PL: ${this.pair.exchange.currentPL} (${this.pair.exchange.currentPL_Perc} %)`);
          logger.debug(`${time} - TP (${this.takeProfitPrice.toFixed(3)}) not reached yet... (try to set SL (${this.stopLossPrice.toFixed(3)}) to SAR (${this.pair.indicators[Indicator.SAR].toFixed(3)}) in order to minimize risk)`);
          this.debounce += 1;
          if (this.debounce > 4) {
            if (this.pair.indicators[Indicator.SAR] > this.stopLossPrice) {
              logger.debug(`${time} - SAR (${this.pair.indicators[Indicator.SAR].toFixed(3)}) reaches SL (${this.stopLossPrice.toFixed(3)})... (set SL price to SAR)`);
              this.stopLossPrice = this.pair.indicators[Indicator.SAR];
              if (this.stopLossOrder.status === 'ACTIVE' && config.trading.enabled) {
                logger.debug(`${time} - Trading is ENABLED: Adjusting SL order on exchange...`);
                this.stopLossOrder.update({ price: this.stopLossPrice });
                logger.info(`${time} - SL = SAR = ${this.stopLossPrice.toFixed(3)} (CP: ${this.pair.currentPrice.toFixed(3)}) (${this.type})`);
              }
            } else logger.debug(`${time} - SAR (${this.pair.indicators[Indicator.SAR].toFixed(3)}) to far away from SL (${this.stopLossPrice.toFixed(3)})... (wait for SAR to come closer)`);
          } else logger.debug(`${time} - Still debouncing... (${this.debounce})`);
        }
      } else if (this.type === PositionType.SHORT) {
        logger.debug(`${time} - SHORT Position...`);
        if (this.pair.currentPrice <= this.takeProfitPrice) {
          logger.debug(`${time} - TP (${this.takeProfitPrice.toFixed(3)}) price REACHED... (try to save profits, enabling trailing)`);
          this.stopLossPrice = this.pair.currentPrice * 1.0001;
          this.takeProfitBasePrice = this.pair.currentPrice * (1 - (this.stopLossPerc / 100));
          this.profitTrailing = true;
          if (this.stopLossOrder.status === 'ACTIVE' && config.trading.enabled) {
            logger.debug(`${time} - Trading is ENABLED: Adjusting SL order on exchange...`);
            this.stopLossOrder.update({ price: this.stopLossPrice });
            logger.info(`${time} - CP (${this.pair.currentPrice.toFixed(3)}) reached TP (${this.takeProfitPrice.toFixed(3)}) -> Update SL to ${this.stopLossPrice.toFixed(3)}, next goal at TPB: ${this.takeProfitBasePrice.toFixed(3)}`);
          }
        } else if (this.pair.currentPrice >= this.takeProfitPrice) {
          logger.debug(`${time} - PL: ${this.pair.exchange.currentPL} (${this.pair.exchange.currentPL_Perc} %)`);
          logger.debug(`${time} - TP (${this.takeProfitPrice.toFixed(3)}) not reached yet... (try to set SL (${this.stopLossPrice.toFixed(3)}) to SAR (${this.pair.indicators[Indicator.SAR].toFixed(3)}) in order to minimize risk)`);
          this.debounce += 1;
          if (this.debounce > 4) {
            if (this.pair.indicators[Indicator.SAR] < this.stopLossPrice) {
              logger.debug(`${time} - SAR reaches SL price... (set SL price to SAR)`);
              this.stopLossPrice = this.pair.indicators[Indicator.SAR];
              if (this.stopLossOrder.status === 'ACTIVE' && config.trading.enabled) {
                logger.debug(`${time} - Trading is ENABLED: Adjusting SL order on exchange...`);
                this.stopLossOrder.update({ price: this.stopLossPrice });
                logger.info(`${time} - SL = SAR = ${this.stopLossPrice.toFixed(3)} (CP: ${this.pair.currentPrice.toFixed(3)}) (${this.type})`); 
              }
            } else logger.debug(`${time} - SAR (${this.pair.indicators[Indicator.SAR].toFixed(3)}) to far away from SL (${this.stopLossPrice.toFixed(3)})... (wait for SAR to come closer)`);
          } else logger.debug(`${time} - Still debouncing... (${this.debounce})`);
        }
      }
    }
    if (this.profitTrailing) {
      logger.debug(`${time} - Trailing active...`); // Todo: Aufteilen um zu wissen was trailing gerade macht...
      if (this.type === PositionType.LONG && this.pair.currentPrice >= this.takeProfitBasePrice) {
        logger.debug(`${time} - (price above TP) and reach TPB -> Adapt SL`);
        this.stopLossPrice = (this.pair.currentPrice * (1 - (this.stopLossPerc / 100)));
        this.takeProfitBasePrice = this.pair.currentPrice;
        if (this.stopLossOrder.status === 'ACTIVE' && config.trading.enabled) {
          logger.debug(`${time} - Trading is ENABLED: Adjusting SL order on exchange...`);
          this.stopLossOrder.update({ price: this.stopLossPrice });
          logger.info(`${time} - Stop Loss updated to: ${(this.stopLossPrice).toFixed(3)}`);
        }
      } else if (this.type === PositionType.SHORT && this.pair.currentPrice <= this.takeProfitBasePrice) {
        logger.debug(`${time} - (price under TP) and reach TPB -> Adapt SL`);
        this.stopLossPrice = (this.pair.currentPrice * (1 + (this.stopLossPerc / 100)));
        this.takeProfitBasePrice = this.pair.currentPrice;
        if (this.stopLossOrder.status === 'ACTIVE' && config.trading.enabled) {
          logger.debug(`${time} - Trading is ENABLED: Adjusting SL order on exchange...`);
          this.stopLossOrder.update({ price: this.stopLossPrice });
          logger.info(`${time} - Stop Loss updated to: ${(this.stopLossPrice).toFixed(3)}`);
        }
      }
    }
  }
  /**
   * Trailing of take profit limit increase
   * Idee: Beim Training immer auf den Open Wert von der Vorgänger Candle setzen (schöne Treppe)
   */
  updateTakeProfit() {
    const time = new Date().toLocaleTimeString();
    if (this.type === PositionType.LONG && this.pair.currentPrice > this.takeProfitBasePrice) {
      this.takeProfitPrice = (this.pair.currentPrice *
        (1 + (this.takeProfitPerc / 100)));
      this.takeProfitBasePrice = this.pair.currentPrice;
      logger.info(`${time} - Take profit updated to: ${this.takeProfitPrice.toFixed(3)}`);
    } else if (this.type === PositionType.SHORT && this.pair.currentPrice < this.takeProfitBasePrice) {
      this.takeProfitPrice = (this.pair.currentPrice *
        (1 - (this.takeProfitPerc / 100)));
      this.takeProfitBasePrice = this.pair.currentPrice;
      logger.info(`${time} - Take profit updated to: ${this.takeProfitPrice.toFixed(3)}`);
    }
  }
};
