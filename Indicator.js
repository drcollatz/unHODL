const RSI = require('./indicators/RSI');
const ADX = require('./indicators/ADX');
const SAR = require('./indicators/SAR');

const Indicator = {
  RSI: 0,
  ADX: 1,
  SAR: 2,
  MAXINDICATOR: 3,

  toString(indicator) {
    let str = '';
    switch (indicator) {
      case Indicator.RSI:
        str = 'RSI';
        break;
      case Indicator.ADX:
        str = 'ADX';
        break;
      case Indicator.SAR:
        str = 'SAR';
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
        indicatorValue = RSI.rsiCalculation(candles);
        break;
      case Indicator.ADX:
        indicatorValue = ADX.adxCalculation(candles);
        break;
      case Indicator.SAR:
        indicatorValue = SAR.sarCalculation(candles);
        break;
      default:
        break;
    }
    return indicatorValue;
  },
};

module.exports.Indicator = Indicator;
