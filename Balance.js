const config = require('./config');
const BFX = require('bitfinex-api-node');

module.exports = class Balance {
  constructor() {
    this.bfx = new BFX({
      apiKey: config.bitfinex.key,
      apiSecret: config.bitfinex.secret,
      ws: {
        autoReconnect: true,
        seqAudit: true,
        packetWDDelay: 10 * 1000,
      },
    });
    this.balances = {};
    if (config.bitfinex.key !== '') {
      this.rest = this.bfx.rest(2, {
        transform: true,
      });
    }
  }

  /**
 * Fetches the balances from exchange via REST
 *
 * @returns
 */
  async checkBalances() {
    const balances = await this.rest.balances();
    balances.forEach((b) => {
      if (b.type === 'trading' && b.currency === 'usd') {
        console.log(`${new Date().toLocaleTimeString()} - Wallet amount: ${b.amount}`);
        console.log(`${new Date().toLocaleTimeString()} - Wallet available: ${b.available}`);
        this.balances.available = b.available;
        this.balances.amount = b.amount;
      }
    });
  }

  async getBalance() {
    await this.checkBalances();
    return this.balances;
  }
};
