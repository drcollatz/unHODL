const { RSI } = require('technicalindicators');

/**
 * Calculates the Relative Strength Index (RSI) indicator
 * @param {any} candles
 */
module.exports.rsiCalculation = (candles) => {
  const input = {
    values: candles.map(x => x.close).reverse(),
    period: 14,
  };

  const resultArray = RSI.calculate(input);
  const currentValue = resultArray[resultArray.length - 1];
  return currentValue;
};
