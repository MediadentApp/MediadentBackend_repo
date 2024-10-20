const express = require('express');
const mainRoutes = require('./mainRoutes');
const userAuthRoutes = require('./userAuthRoutes');
const oauthRoutes = require('./oauthRoutes');
const userFormatApi = require('./formatApiRoutes');
const { protect } = require('@src/controllers/authController');

const router = express.Router();

router.use('/api/v1/user', protect, mainRoutes);
router.use('/api/v1/auth', userAuthRoutes);
router.use('/api/v1/userformat', userFormatApi);
router.use('/oauth2', oauthRoutes);

module.exports = router;
