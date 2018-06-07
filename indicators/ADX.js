const { ADX } = require('technicalindicators');

/**
 * Calculates the ADX indicator
 * @param {any} close
 * @param {any} high
 * @param {any} low
 */
module.exports.adxCalculation = (close, high, low) => {
  const inputADX = {
    close,
    high,
    low,
    period: 14,
  };
  const adxResultArray = ADX.calculate(inputADX);
  const currentADX = adxResultArray[adxResultArray.length - 1];
  return currentADX;
};

/*
const adx = new ADX({
  period, high: input.high, low: input.low, close: input.close,
});

console.log(adx);
*/
