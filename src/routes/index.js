const express = require('express');
const mainRoutes = require('./mainRoutes');
const userRoutes = require('./userRoutes');
const oauthRoutes = require('./oauthRoutes');
const userFormatApi = require('./formatApiRoutes'); 

const router = express.Router();

router.use('/', mainRoutes);
router.use('/api/v1/users', userRoutes);
router.use('/api/v1/userformat', userFormatApi);
router.use('/auth', oauthRoutes);

module.exports = router;
