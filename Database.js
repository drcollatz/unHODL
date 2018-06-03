const mongoose = require('mongoose');
const Price = require('./models/price');

mongoose.connect('mongodb+srv://unhodl:4y8xktwaoTxNQxUy@unhodl-db-eadeo.mongodb.net/test?retryWrites=true');

module.exports = {
  async savePriceToDb(currentPrice) {
    const price = new Price({
      _id: new mongoose.Types.ObjectId(),
      pair: 'EOSUSD',
      time: new Date().toLocaleTimeString(),
      price: currentPrice,
    });

    await price.save((err) => {
      if (err) {
        return console.log(err);
      }
      return true;
    });
  },
};
