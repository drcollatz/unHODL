const config = require('./conf/config');


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

    if (this.type === PositionType.LONG) {
      this.takeProfitPrice = (this.orderPrice * (1 + (takeProfitPerc / 100)));
      this.stopLossPrice = (this.orderPrice * (1 - (stopLossPerc / 100)));
    } else if (this.type === PositionType.SHORT) {
      this.takeProfitPrice = (this.orderPrice * (1 - (takeProfitPerc / 100)));
      this.stopLossPrice = (this.orderPrice * (1 + (stopLossPerc / 100)));
    }

    this.doTrailing = doTrailing;
    this.stopLossBasePrice = this.orderPrice;
    this.takeProfitBasePrice = this.orderPrice;
    this.profit = 0;
  }
  toString() {
    const posType = this.type === PositionType.SHORT ? 'SHORT' : 'LONG';
    const closeResult = (this.profit > 0) ? '\u{1F3C6}' : '\u{1F62C}';
    const trailing = (this.doTrailing) ? 'ON' : 'OFF';
    const stats = `\`Amount   = ${(this.amount).toFixed(3)} \`\`${this.pair} \`\n\`RSI      = ${this.pair.currentRSI}\`\n\`TP       = ${(this.takeProfitPrice).toFixed(3)}\`\` USD\`\n\`SL       = ${(this.stopLossPrice).toFixed(3)}\`\` USD\`\n\`Trailing = ${trailing}\``;
    const close = `${this.pair}, ${posType} closed @ ${this.closingPrice.toFixed(3)} USD (${(this.profit).toFixed(2)} %) ${closeResult}\n\`-------------------------------------\`\n${stats}`;
    const open = `${this.pair}, ${posType} opened @ ${this.orderPrice.toFixed(3)} USD \u{1F195}\n\`----------------------------\`\n${stats}`;
    return this.closingPrice ? close : open;
  }

  open() {
    return this; // TBD
  }

  close() {
    // Calc profit in % for now, calc profit for short as positive
    this.profit = ((this.pair.currentPrice - this.orderPrice) / this.orderPrice) * 100;
    if (this.type === PositionType.SHORT) {
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
      (this.type === PositionType.LONG &&
        (this.pair.currentPrice >= this.takeProfitPrice ||
          this.pair.currentPrice <= this.stopLossPrice)) ||
      (this.type === PositionType.SHORT &&
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
    if (this.type === PositionType.LONG && this.pair.currentPrice > this.stopLossBasePrice) {
      this.stopLossPrice = (
        this.pair.currentPrice *
        (1 - (config.trading.stopLossPerc / 100))
      );
      this.stopLossBasePrice = this.pair.currentPrice;
      console.log(`Stop Loss updated to: ${(this.stopLossPrice).toFixed(3)}`);
    } else if (this.type === PositionType.SHORT && this.pair.currentPrice < this.stopLossBasePrice) {
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
    if (this.type === PositionType.LONG && this.pair.currentPrice > this.takeProfitBasePrice) {
      this.takeProfitPrice = (this.pair.currentPrice *
        (1 + (this.takeProfitPerc / 100)));
      this.takeProfitBasePrice = this.pair.currentPrice;
      console.log(`Take profit updated to: ${this.takeProfitPrice}`);
    } else if (this.type === PositionType.SHORT && this.pair.currentPrice < this.takeProfitBasePrice) {
      this.takeProfitPrice = (this.pair.currentPrice *
        (1 - (this.takeProfitPerc / 100)));
      this.takeProfitBasePrice = this.pair.currentPrice;
      console.log(`Take profit updated to: ${this.takeProfitPrice}`);
    }
  }
};
