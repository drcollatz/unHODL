const { PSAR } = require('technicalindicators');

/**
 * Calculates the Parabolic Stop and Reverse (PSAR) indicator
 * @param {any} candles
 */
module.exports.sarCalculation = (candles) => {
  const input = {
    high: candles.map(x => x[2]).reverse(),
    low: candles.map(x => x[3]).reverse(),
    step: 0.02,
    max: 0.02,
  };

  const resultArray = PSAR.calculate(input);
  const currentValue = resultArray[resultArray.length - 1];
  return currentValue;
};
