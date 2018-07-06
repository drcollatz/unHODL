const { ADX } = require('technicalindicators');

/**
 * Calculates the Average Directional Index (ADX) indicator
 * @param {any} candles
 */
module.exports.adxCalculation = (candles) => {
  const input = {
    close: candles.map(x => x.close).reverse(),
    high: candles.map(x => x.high).reverse(),
    low: candles.map(x => x.low).reverse(),
    period: 3,
  };

  const resultArray = ADX.calculate(input).map(x => x.adx);
  const currentValue = resultArray[resultArray.length - 1];
  return currentValue;
};
