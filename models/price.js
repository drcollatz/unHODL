const mongoose = require('mongoose');

const priceShema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  pair: '',
  time: '',
  price: '',
});

module.exports = mongoose.model('Price', priceShema);
