const express = require('express');
const googleAuthController = require('@src/controllers/googleAuthController.js');
const authController = require('@src/controllers/authController.js');

const router = express.Router();

router.get('/', googleAuthController.googleAuth);
router.get('/callback', googleAuthController.googleAuthCallback, (req, res) => {
  console.log('done');
  res.send('success');
});

router.post('/callback', authController.googleSignup,);

module.exports = router;
