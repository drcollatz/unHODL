const LiveTradingPair = require('./TradingPair.js').LiveTradingPair;
const Indicator = require('./Indicator.js').Indicator;

module.exports.Condition = class Condition {
  constructor(threshold, risingEdge, fallingEdge, indicator, pair) {
    this.threshold = threshold;
    this.indicator = indicator;
    this.risingEdge = risingEdge;
    this.fallingEdge = fallingEdge;
    this.pair = pair;

    if (this.indicator >= Indicator.MAXINDICATOR) {
      throw Promise.reject(new Error('Indicator not known!'));
    }
    if ((fallingEdge && risingEdge) || (fallingEdge && risingEdge)) {
      throw Promise.reject(new Error('Illegal condition!'));
    }
  }

  isTrue() {
    const indicatorValue = this.pair.getValueForIndicator(this.indicator);
    if (this.fallingEdge) {
      if (!this.blocked && indicatorValue < this.threshold) {
        this.blocked = true;
        return true;
      } else if (indicatorValue > this.threshold) {
        this.blocked = false;
      }
    } else if (this.risingEdge) {
      if (!this.blocked && indicatorValue > this.threshold) {
        this.blocked = true;
        return true;
      } else if (indicatorValue < this.threshold) {
        this.blocked = false;
      }
    }
    return false;
  }
};

module.exports.TradeTrigger = class TradeTrigger {
  constructor(condition, positionType) {
    this.conditions = [];
    this.conditions.push(condition);
    this.positionType = positionType;
  }

  addCondition(condition) {
    this.conditions.push(condition);
  }
  checkTrigger() {
    let triggerCondition = true;
    this.conditions.forEach((condition) => {
      triggerCondition = (triggerCondition && condition.isTrue());
    });
    return triggerCondition;
  }
};
