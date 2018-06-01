
const { RSI } = require('technicalindicators');



  module.exports.rsiCalculation = function (closeData) {
    const inputRSI = {
      values: closeData,
      period: 14,
    };
    const rsiResultArray = RSI.calculate(inputRSI);
    var currentRSI = rsiResultArray[rsiResultArray.length - 1];
    return currentRSI;
  }