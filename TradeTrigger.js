const { Indicator } = require('./Indicator.js');

module.exports.Condition = class Condition {
  constructor(threshold, risingEdge, fallingEdge, indicator, pair) {
    this.threshold = threshold;
    this.indicator = indicator;
    this.risingEdge = risingEdge;
    this.fallingEdge = fallingEdge;
    this.pair = pair;
    this.blocked = true;

    if (this.indicator >= Indicator.MAXINDICATOR) {
      throw Promise.reject(new Error('Indicator not known!'));
    }
    if ((fallingEdge && risingEdge) || (!fallingEdge && !risingEdge)) {
      throw Promise.reject(new Error('Illegal condition!'));
    }
  }

  block() {
    this.blocked = true;
  }

  isTrue() {
    const indicatorValue = this.pair.getValueForIndicator(this.indicator);
    if (indicatorValue === 0) {
      // return false, to avoid order execution on startup, if indicator value is 0 -> zero initialized !
      return false;
    }

    if (this.fallingEdge) {
      if (this.indicator === Indicator.SAR) {
        if (!this.blocked && indicatorValue < this.pair.currentPrice) {
          return true;
        } else if (indicatorValue > this.pair.currentPrice) {
          this.blocked = false;
        }
      } else if (!this.blocked && indicatorValue < this.threshold) {
        return true;
      } else if (indicatorValue > this.threshold) {
        this.blocked = false;
      }
    } else if (this.risingEdge) {
      if (this.indicator === Indicator.SAR) {
        if (!this.blocked && indicatorValue > this.pair.currentPrice) {
          return true;
        } else if (indicatorValue < this.pair.currentPrice) {
          this.blocked = false;
        }
      } else if (!this.blocked && indicatorValue > this.threshold) {
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
    if (triggerCondition) {
      this.conditions.forEach((condition) => {
        condition.block();
      });
    }
    return triggerCondition;
  }
};
