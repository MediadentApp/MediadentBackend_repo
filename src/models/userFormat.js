const mongoose = require('mongoose');

const userFormatSchema = new mongoose.Schema({
  userType: {
    type: [String], // Store an array of allowed user types
    required: true
  },
  userGenders: {
    type: [String], // Store an array of allowed gender types
    required: true
  }
});

const UserFormat = mongoose.model('UserFormat', userFormatSchema);
module.exports = UserFormat;
