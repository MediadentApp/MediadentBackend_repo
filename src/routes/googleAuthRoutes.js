const express = require('express');
const googleAuthController = require('@src/controllers/googleAuthController.js');

const router = express.Router();

router.get('/', googleAuthController.googleAuth);
router.get('/callback', googleAuthController.googleAuthCallback, (req, res) => {
  console.log('done');
  res.send('success');
});

router.post('/callback', googleAuthController.googleSignup, (req, res) => {
  console.log('done');
  res.send('success');
});

module.exports = router;
