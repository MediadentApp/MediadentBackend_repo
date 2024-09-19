const express = require('express');
const oauthController = require('@src/controllers/oauthController');

const router = express.Router();

router.get('google/', oauthController.googleAuth);
router.get('google/callback', oauthController.googleAuthCallback);
router.get('github/', oauthController.githubAuth);
router.get('github/callback', oauthController.githubAuthCallback);

module.exports = router;
