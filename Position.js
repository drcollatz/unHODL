const config = require('./conf/config');

module.exports = class Position {
  constructor(pair, type, amount, orderPrice, takeProfitPerc, stopLossPerc, doTrailing) {
    this.pair = pair;
    this.type = type;
    this.amount = amount;
    this.orderPrice = orderPrice;

    if (this.type === 'LONG') {
      this.takeProfitPrice = (this.orderPrice * (1 + (takeProfitPerc / 100)));
      this.stopLossPrice = (this.orderPrice * (1 - (stopLossPerc / 100)));
    } else if (this.type === 'SHORT') {
      this.takeProfitPrice = (this.orderPrice * (1 - (takeProfitPerc / 100)));
      this.stopLossPrice = (this.orderPrice * (1 + (stopLossPerc / 100)));
    }

    this.doTrailing = doTrailing;
    this.stopLossBasePrice = this.orderPrice;
    this.takeProfitBasePrice = this.orderPrice;
    this.profit = 0;
  }
  toString() {
    const close = (this.closingPrice) ? `closed @ ${this.closingPrice}\n` : '';
    const profit = (this.profit) ? `Profit: ${this.profit.toFixed(2)}\n` : '';
    const trailing = (this.doTrailing) ? 'Trailing is active\n' : '';
    const ret = `${close}${this.type} on ${this.pair}\nopen = ${this.orderPrice}\nAmount = ${(this.amount).toFixed(3)}\nRSI = ${this.pair.currentRSI}\nTP = ${(this.takeProfitPrice).toFixed(3)}\nSL = ${(this.stopLossPrice).toFixed(3)}\n${profit}${trailing}`;
    return ret;
  }

  open() {
    return this; // TBD
  }

  close() {
    // Calc profit in % for now, calc profit for short as positive
    this.profit = ((this.pair.currentPrice - this.orderPrice) / this.orderPrice) * 100;
    if (this.type === 'SHORT') {
      this.profit *= -1;
    }
    this.closingPrice = this.pair.currentPrice;
  }

  update() {
    this.profit = (this.amount * this.pair.currentPrice) - (this.amount * this.orderPrice);
    if (this.checkClosing()) {
      this.close();
      this.pair.onPositionClosed(this);
    }

    if (this.doTrailing) {
    //  this.updateTakeProfit();
      this.updateStopLoss();
    }
  }

  /**
   * Checks if the position closing conditions are met.
   */
  checkClosing() {
    let ret = false;
    if (
      (this.type === 'LONG' &&
        (this.pair.currentPrice >= this.takeProfitPrice ||
          this.pair.currentPrice <= this.stopLossPrice)) ||
      (this.type === 'SHORT' &&
        (this.pair.currentPrice <= this.takeProfitPrice ||
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
    if (this.type === 'LONG' && this.pair.currentPrice > this.stopLossBasePrice) {
      this.stopLossPrice = (
        this.pair.currentPrice *
        (1 - (config.trading.stopLossPerc / 100))
      );
      this.stopLossBasePrice = this.pair.currentPrice;
      console.log(`Stop Loss updated to: ${(this.stopLossPrice).toFixed(3)}`);
    } else if (this.type === 'SHORT' && this.pair.currentPrice < this.stopLossBasePrice) {
      this.stopLossPrice = (
        this.pair.currentPrice *
        (1 + (config.trading.stopLossPerc / 100))
      );
      this.stopLossBasePrice = this.pair.currentPrice;
      console.log(`Stop Loss updated to: ${(this.stopLossPrice).toFixed(3)}`);
    }
  }

  /**
   * Trailing of take profit limit increase
   */
  updateTakeProfit() {
    if (this.type === 'LONG' && this.pair.currentPrice > this.takeProfitBasePrice) {
      this.takeProfitPrice = (this.pair.currentPrice *
        (1 + (this.takeProfitPerc / 100)));
      this.takeProfitBasePrice = this.pair.currentPrice;
      console.log(`Take profit updated to: ${this.takeProfitPrice}`);
    } else if (this.type === 'SHORT' && this.pair.currentPrice < this.takeProfitBasePrice) {
      this.takeProfitPrice = (this.pair.currentPrice *
        (1 - (this.takeProfitPerc / 100)));
      this.takeProfitBasePrice = this.pair.currentPrice;
      console.log(`Take profit updated to: ${this.takeProfitPrice}`);
    }
  }
};
