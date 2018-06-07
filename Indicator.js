const RSI = require('./indicators/RSI');

const Indicator = {
  RSI: 0,
  ADX: 1,
  MAXINDICATOR: 2,

  toString(indicator) {
    let str = '';
    switch (indicator) {
      case Indicator.RSI:
        str = 'RSI';
        break;
      case Indicator.ADX:
        str = 'ADX';
        break;
      default:
        break;
    }
    return str;
  },

  calc(indicator, candles) {
    let indicatorValue = 0;
    switch (indicator) {
      case Indicator.RSI:
        indicatorValue = RSI.rsiCalculation(candles.map(x => x.close).reverse());
        break;
      case Indicator.ADX:
        indicatorValue = 11;
        break;
      default:
        break;
    }
    return indicatorValue;
  },
};

module.exports.Indicator = Indicator;
