const config = require('./conf/config');
const { Indicator } = require('./Indicator');
const { Order } = require('./node_modules/bitfinex-api-node/lib/models');
// const Balance = require('./Balance');

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

    if (this.type === PositionType.LONG) {
      this.takeProfitPrice = (this.orderPrice * (1 + (takeProfitPerc / 100)));
      this.takeProfitBasePrice = this.takeProfitPrice;
      this.stopLossPrice = (this.orderPrice * (1 - (stopLossPerc / 100)));
    } else if (this.type === PositionType.SHORT) {
      this.takeProfitPrice = (this.orderPrice * (1 - (takeProfitPerc / 100)));
      this.takeProfitBasePrice = this.takeProfitPrice;
      this.stopLossPrice = (this.orderPrice * (1 + (stopLossPerc / 100)));
    }

    this.doTrailing = doTrailing;
    this.profitTrailing = false;
    this.stopLossBasePrice = this.orderPrice;
    // this.takeProfitBasePrice = this.orderPrice;
    this.profit = 0;

    this.openPosOrder = new Order({
      cid: Date.now(),
      symbol: 'tEOSUSD',
      amount: (this.type === PositionType.LONG) ? 2 : -2,
      type: Order.type.MARKET,
    }, pair.exchange.ws);

    this.stopLossOrder = new Order({
      cid: Date.now() + 1,
      symbol: 'tEOSUSD',
      amount: (this.type === PositionType.LONG) ? -2 : 2,
      price: this.stopLossPrice,
      type: Order.type.STOP,
    }, pair.exchange.ws);

    // Enable automatic updates
    this.openPosOrder.registerListeners();
    this.stopLossOrder.registerListeners();

    // 14298127540,,1531474157801,tEOSUSD,1531474157281,1531474157302,0,-2,MARKET,,,,0,EXECUTED @ 7.0663(-2.0),,,7.0733,7.0663,,,,,,0,,0
    this.openPosOrder.on('update', () => {
    //  console.log(`ORDER UPDATE - ID: ${this.openPosOrder.id} Type: ${this.openPosOrder.toPreview().type} Status: ${this.openPosOrder.status}`);
    });

    this.stopLossOrder.on('update', () => {
      console.log(`ORDER UPDATE - ID: ${this.stopLossOrder.id} Type: ${this.stopLossOrder.toPreview().type} Status: ${this.stopLossOrder.status}`);
    });

    this.openPosOrder.on('close', () => {
      console.log(`ORDER UPDATE - ID: ${this.takeProfitPrice.id} Type: ${this.openPosOrder.toPreview().type} Status: ${this.openPosOrder.status}`);
      if (this.openPosOrder.status !== 'CANCELED') {
        console.log(`Average Price: ${this.takeProfitPrice.priceAvg}`);
        this.takeProfitPrice = this.openPosOrder.priceAvg * ((this.type === PositionType.LONG) ? (1 + (this.takeProfitPerc / 100)) : (1 - (this.takeProfitPerc / 100)));
        console.log(`Take Profit Price: ${this.takeProfitPrice}`);
        this.stopLossOrder.submit().then(() => {
          console.log('STOP LOSS ORDER PLACED!');
          console.log(`ID: ${this.stopLossOrder.id} Type: ${this.stopLossOrder.toPreview().type} Status: ${this.stopLossOrder.status}`);
        });
      }
    });
  }

  toString() {
    const posType = this.type === PositionType.SHORT ? '\u{1F4C9}' : '\u{1F4C8}';
    const closeResult = (this.profit > 0) ? '\u{1F44D}' : '\u{1F44E}';
    const trailing = (this.doTrailing) ? 'ON' : 'OFF';
    const balanceDiff = ((this.pair.exchange.currentBalance - config.trading.startBalance) / config.trading.startBalance) * 100;

    const strStartTime = `\`Started @ ${this.startTime.toString()}`;

    const strPeriod = `\`Running for ${this.period.toTimeString()}`;

    const amount = `\`Amount   = ${(this.amount).toFixed(3)} ${this.pair}`;
    let strIndicator = '';
    this.pair.indicatorMap.forEach((candleKey, indicator) => {
      strIndicator += `\n${Indicator.toString(indicator)}      = ${this.pair.indicators[indicator].toFixed(3)}`;
    });

    const stats = `\nTP       = ${(this.takeProfitPrice).toFixed(3)} USD (${config.trading.takeProfitPerc}%)\
                   \nSL       = ${(this.stopLossPrice).toFixed(3)} USD (${config.trading.stopLossPerc}%)\
                   \nTrailing = ${trailing}\
                   \nBalance  = ${(this.pair.exchange.currentBalance).toFixed(2)} USD (${balanceDiff.toFixed(2)} %) \
                   \nTrades   = ${this.pair.exchange.tradeCounterWin} \u{1F44D} / ${this.pair.exchange.tradeCounterLost} \u{1F44E}\``;

    const close = `${posType} \u{1F534} @ ${this.closingPrice.toFixed(3)} USD (${(this.profit).toFixed(2)} %) ${closeResult}\
                   \n\`----------------------\`\n${amount}${strIndicator}${stats}${strPeriod}`;

    const open = `${posType} \u{1F195} @ ${this.orderPrice.toFixed(3)} USD \
                   \n\`----------------------\`\n${amount}${strIndicator}${stats}${strStartTime}`;
    return this.closingPrice ? close : open;
  }

  open() {
    this.openPosOrder.submit().then(() => {
      console.log(`submitted order ${this.openPosOrder.id}`);
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
    this.period = new Date() - this.startTime;
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
  async updateStopLoss() {
    // const b = new Balance();
    // const balance = await b.getBalance();
    // console.log(`Position pl: ${balance.positions.pl}`);
    if (this.type === PositionType.LONG && this.pair.currentPrice >= this.takeProfitPrice && !this.profitTrailing) {
      this.stopLossPrice = this.pair.currentPrice * 0.9999;
      this.takeProfitBasePrice = this.pair.currentPrice * (1 + (this.stopLossPerc / 100));
      this.profitTrailing = true;
      if (this.stopLossOrder.status === 'ACTIVE' && config.trading.enabled) this.stopLossOrder.update({ price: this.stopLossPrice });
      console.log(`SL = TP and updated to ${this.stopLossPrice} CP: ${this.pair.currentPrice} TPB: ${this.takeProfitBasePrice}`);
    } else if (this.type === PositionType.SHORT && this.pair.currentPrice <= this.takeProfitPrice && !this.profitTrailing) {
      this.stopLossPrice = this.pair.currentPrice * 1.0001;
      this.takeProfitBasePrice = this.pair.currentPrice * (1 - (this.stopLossPerc / 100));
      this.profitTrailing = true;
      if (this.stopLossOrder.status === 'ACTIVE' && config.trading.enabled) this.stopLossOrder.update({ price: this.stopLossPrice });
      console.log(`SL = TP and updated to ${this.stopLossPrice} CP: ${this.pair.currentPrice} TPB: ${this.takeProfitBasePrice}`);
    } else if (this.type === PositionType.LONG && this.pair.currentPrice <= this.takeProfitPrice && !this.profitTrailing) {
      if (this.pair.indicators[Indicator.SAR] > this.stopLossPrice) {
        this.stopLossPrice = this.pair.indicators[Indicator.SAR];
        if (this.stopLossOrder.status === 'ACTIVE' && config.trading.enabled) this.stopLossOrder.update({ price: this.stopLossPrice });
        console.log(`SL = SAR and updated to ${this.stopLossPrice}`);
      }
    } else if (this.type === PositionType.SHORT && this.pair.currentPrice >= this.takeProfitPrice && !this.profitTrailing) {
      if (this.pair.indicators[Indicator.SAR] < this.stopLossPrice) {
        this.stopLossPrice = this.pair.indicators[Indicator.SAR];
        if (this.stopLossOrder.status === 'ACTIVE' && config.trading.enabled) this.stopLossOrder.update({ price: this.stopLossPrice });
        console.log(`SL = SAR and updated to ${this.stopLossPrice}`);
      }
    }
    if (this.type === PositionType.LONG && this.pair.currentPrice >= this.takeProfitBasePrice && this.profitTrailing) {
      this.stopLossPrice = (this.pair.currentPrice * (1 - (this.stopLossPerc / 100)));
      this.takeProfitBasePrice = this.pair.currentPrice;
      if (this.stopLossOrder.status === 'ACTIVE' && config.trading.enabled) this.stopLossOrder.update({ price: this.stopLossPrice });
      console.log(`Stop Loss updated to: ${(this.stopLossPrice).toFixed(3)}`);
    } else if (this.type === PositionType.SHORT && this.pair.currentPrice <= this.takeProfitBasePrice && this.profitTrailing) {
      this.stopLossPrice = (this.pair.currentPrice * (1 + (this.stopLossPerc / 100)));
      this.takeProfitBasePrice = this.pair.currentPrice;
      if (this.stopLossOrder.status === 'ACTIVE' && config.trading.enabled) this.stopLossOrder.update({ price: this.stopLossPrice });
      console.log(`Stop Loss updated to: ${(this.stopLossPrice).toFixed(3)}`);
    }
  }

  /**
   * Trailing of take profit limit increase
   */
  updateTakeProfit() {
    if (this.type === PositionType.LONG && this.pair.currentPrice > this.takeProfitBasePrice) {
      this.takeProfitPrice = (this.pair.currentPrice *
        (1 + (this.takeProfitPerc / 100)));
      this.takeProfitBasePrice = this.pair.currentPrice;
      console.log(`Take profit updated to: ${this.takeProfitPrice.toFixed(3)}`);
    } else if (this.type === PositionType.SHORT && this.pair.currentPrice < this.takeProfitBasePrice) {
      this.takeProfitPrice = (this.pair.currentPrice *
        (1 - (this.takeProfitPerc / 100)));
      this.takeProfitBasePrice = this.pair.currentPrice;
      console.log(`Take profit updated to: ${this.takeProfitPrice.toFixed(3)}`);
    }
  }
};
