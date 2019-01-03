const { PSAR } = require('technicalindicators');

/**
 * Calculates the Parabolic Stop and Reverse (PSAR) indicator
 * @param {any} candles
 */
module.exports.sarCalculation = (candles) => {
  const input = {
    high: candles.map(x => x.high).reverse(),
    low: candles.map(x => x.low).reverse(),
    step: 0.02,
    max: 0.2,
  };

  const resultArray = PSAR.calculate(input);
  const currentValue = resultArray[resultArray.length - 1];
  return currentValue;
};
