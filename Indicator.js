const RSI = require('./indicators/RSI');
const ADX = require('./indicators/ADX');
const SAR = require('./indicators/SAR');

const Indicator = {
  RSI: 0,
  ADX: 1,
  SAR: 2,
  MAXINDICATOR: 3,
  CANDLE_KEY_EOS_USD_1M: 'trade:1m:tEOSUSD',
  CANDLE_KEY_EOS_USD_5M: 'trade:5m:tEOSUSD',
  CANDLE_KEY_BTC_USD_1M: 'trade:1m:tBTCUSD',
  CANDLE_KEY_BTC_USD_5M: 'trade:5m:tBTCUSD',
  CANDLE_KEY_ETH_USD_1M: 'trade:1m:tETHUSD',
  CANDLE_KEY_ETH_USD_5M: 'trade:5m:tETHUSD',

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
