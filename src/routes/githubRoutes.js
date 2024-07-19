const express = require('express');
const githubAuthController = require('@src/controllers/githubAuthController.js');

const router = express.Router();

router.get('/', githubAuthController.githubAuth);

router.get('/callback', githubAuthController.githubAuthCallback);

module.exports = router;
