const express = require('express');
const googleAuthController = require('@src/controllers/googleAuthController.js');
const authController = require('@src/controllers/authController.js');

const router = express.Router();

router.get('/', googleAuthController.googleAuth);
router.get('/callback', googleAuthController.googleAuthCallback);

module.exports = router;
