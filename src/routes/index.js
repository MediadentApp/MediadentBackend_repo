const express = require('express');
const mainRoutes = require('./mainRoutes');
const userRoutes = require('./userRoutes');
const googleRoutes = require('@src/routes/googleAuthRoutes.js');

const router = express.Router();

router.use('/', mainRoutes);
router.use('/api/v1/users', userRoutes);
router.use('/auth/google', googleRoutes);

module.exports = router;
