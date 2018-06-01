const config = require('./config');

module.exports = class Position {
    constructor(pair, type, amount, orderPrice, takeProfitPerc, stopLossPerc, doTrailing){
        this.pair = pair;
        this.type = type;
        this.amount = amount
        this.orderPrice = orderPrice;

        if(this.type === 'long')
        {
            this.takeProfitPrice = (this.orderPrice * (1 + (takeProfitPerc / 100))).toFixed(3);;
            this.stopLossPrice = (this.orderPrice * (1 - (stopLossPerc / 100))).toFixed(3);
        }
        else if(this.type === 'short')
        {
            this.takeProfitPrice = (this.orderPrice * (1 - (takeProfitPerc / 100))).toFixed(3);;
            this.stopLossPrice = (this.orderPrice * (1 + (stopLossPerc / 100))).toFixed(3);
        }
        

        this.doTrailing = doTrailing;
        this.stopLossBasePrice = this.orderPrice;
        this.takeProfitBasePrice = this.orderPrice;
        this.profit = 0;
    }
    toString() {
        let ret = `${this.type} position on ${this.pair}: ${this.amount} for ${this.orderPrice} \n TP = ${this.takeProfitPrice} \n SL = ${this.stopLossPrice} \n current profit = ${this.profit.toFixed(2)} \n trailing is ${this.doTrailing}`;
        return ret;
    }

    open()  {

    }
    close() {
        this.profit = (this.amount * this.pair.currentPrice) - (this.amount * this.orderPrice);
    }

    update() {
        this.profit = (this.amount * this.pair.currentPrice) - (this.amount * this.orderPrice);
        if(this.checkClosing())
        {
            this.close();
            this.pair.onPositionClosed(this);
        }

        if(this.doTrailing)
        {
            this.updateTakeProfit();
            this.updateStopLoss();
        }
    }

    /**
    * Checks if the position closing conditions are met.
    */
    checkClosing() {
        var ret = false;
        if ((this.type === 'long' 
            && ((this.pair.currentPrice >= this.takeProfitPrice) || (this.pair.currentPrice <= this.stopLossPrice))) ||          
            (this.type === 'short' 
            && ((this.pair.currentPrice <= this.takeProfitPrice) || (this.pair.currentPrice >= this.stopLossPrice))) )
        {
            ret = true;
        }
        return ret;
    }

    /**
    * Trailing of stop loss limit if profit increase
    */
    updateStopLoss() {
    if (this.type === 'long' && this.pair.currentPrice > this.stopLossBasePrice) {
        this.stopLossPrice = (this.pair.currentPrice * (1 - (config.trading.stopLossPerc / 100))).toFixed(3);
        this.stopLossBasePrice = this.pair.currentPrice;
        console.log(`Stop Loss updated to: ${this.stopLossPrice}`);
    } 
    else if ((this.type === 'short' && this.pair.currentPrice < this.stopLossBasePrice)) {
        this.stopLossPrice = (this.pair.currentPrice * (1 + (config.trading.stopLossPerc / 100))).toFixed(3);
        this.stopLossBasePrice = this.pair.currentPrice;
        console.log(`Stop Loss updated to: ${this.stopLossPrice}`);
    }
}

    /**
    * Trailing of take profit limit increase
    */
   updateTakeProfit() {
    if (this.type === 'long' && this.pair.currentPrice > this.takeProfitBasePrice) {
        this.takeProfitPrice = (this.pair.currentPrice * (1 + (this.takeProfitPerc / 100))).toFixed(3);;
        this.takeProfitBasePrice = this.pair.currentPrice;
        console.log(`Take profit updated to: ${this.takeProfitPrice}`);
    } 
    else if ((this.type === 'short' && this.pair.currentPrice < this.takeProfitBasePrice)) {
        this.takeProfitPrice = (this.pair.currentPrice * (1 - (this.takeProfitPerc / 100))).toFixed(3);
        this.takeProfitBasePrice = this.pair.currentPrice;
        console.log(`Take profit updated to: ${this.takeProfitPrice}`);
    }
  }

};