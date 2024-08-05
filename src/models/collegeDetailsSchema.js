const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
  universityName: String,
  collegeName: String,
  collegeType: String,
  state: String,
  district: String,
});

const College = mongoose.model('College', collegeSchema);

module.exports = College;
// S. No.,University Name,College Name,College Type,State Name,District Name
