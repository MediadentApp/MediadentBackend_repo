const express = require('express');
const googleAuthController = require('@src/controllers/googleAuthController.js');
const githubAuthController = require('@src/controllers/githubAuthController.js');

const router = express.Router();

router.get('google/', googleAuthController.googleAuth);
router.get('google/callback', googleAuthController.googleAuthCallback);
router.get('github/', githubAuthController.githubAuth);
router.get('github/callback', githubAuthController.githubAuthCallback);

module.exports = router;
