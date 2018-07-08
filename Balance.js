const config = require('./conf/config');
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

    this.wallets = {};
    this.wallets.positions = {};

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
    const wallets = await this.rest.wallets();
    wallets.forEach((w) => {
      if (w.type === 'margin' && w.currency === 'USD') {
        console.log(`${new Date().toLocaleTimeString()} - Margin wallet balance: ${w.balance}`);
        this.wallets.balance = w.balance;
      }
    });
  }

  /**
 * Fetches the balances from exchange via REST
 *
 * @returns
 */
  async checkPosition() {
    const positions = await this.rest.positions();
    this.wallets.positions.amount = positions[0].amount;
    this.wallets.positions.pl = positions[0].pl;
  }

  async getBalance() {
    await this.checkBalances();
    await this.checkPosition();
    return this.wallets;
  }
};
