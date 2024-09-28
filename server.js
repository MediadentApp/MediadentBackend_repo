const mongoose = require('mongoose');
const dotenv = require('dotenv');
require('module-alias/register');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: './config.env' });
}

const app = require('./src/app');
const initUserFormat = require('@src/seeders/userFormatSeeds');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
mongoose.connect(DB).then(() => console.log('DB connected'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  // initUserFormat();
});
