const mongoose = require('mongoose');

const AcademicPrograms = mongoose.model('AcademicPrograms', new mongoose.Schema({}, { strict: false }), 'AcademicPrograms');

module.exports = AcademicPrograms;
