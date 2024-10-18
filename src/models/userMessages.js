const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: String,
  sender: String,
  receiver: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
  status: { type: String, default: 'sent' }, // sent, delivered, read
});

module.exports = mongoose.model('Message', messageSchema);
