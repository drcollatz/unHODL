
const { RSI } = require('technicalindicators');


/**
 * Calculates the RSI indicator and determines if a position should be opened
 * @param {any} closeData
 */
module.exports.rsiCalculation = (closeData) => {
  const inputRSI = {
    values: closeData,
    period: 14,
  };
  const rsiResultArray = RSI.calculate(inputRSI);
  const currentRSI = rsiResultArray[rsiResultArray.length - 1];
  return currentRSI;
};
