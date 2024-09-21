const mongoose = require('mongoose');

const UserFormat = mongoose.model('UserFormat', new mongoose.Schema({}, { strict: false }), 'userformats');

const collegeSchema = new mongoose.Schema({
  id: Number,
  state: String,
  name: String,
  address_line1: String,
  address_line2: String,
  city: String,
  district: String,
  pin_code: String
});

const universitySchema = new mongoose.Schema({
  name: String,
  address: String,
  website: String,
  contact: String,
  vc: String,
  vcPhone: String,
  reg: String,
  regPhone: String
});

const cityStates = new mongoose.Schema({
  city: String,
  state: String
});

const College = mongoose.model('College', collegeSchema);
const University = mongoose.model('University', universitySchema, 'universities');
const CityStates = mongoose.model('Citystate', cityStates, 'citystates');

module.exports = { College, University, UserFormat,CityStates };
