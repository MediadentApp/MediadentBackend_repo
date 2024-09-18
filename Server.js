const mongoose = require('mongoose');
const dotenv = require('dotenv');
require('module-alias/register');

dotenv.config({ path: './config.env' });

const app = require('./src/app');
const initUserFormat = require('@src/seeders/userFormatSeeds');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
mongoose.connect(DB).then(() => console.log('DB connected'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  initUserFormat();
});
