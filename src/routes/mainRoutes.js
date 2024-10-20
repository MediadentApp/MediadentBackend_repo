const express = require('express');
const authController = require('../controllers/authController');
const socketController = require('@src/controllers/socketMessageController');

const router = express.Router();

// ?Communication System apis
router.post('/chatid', socketController.chatID);
router.post('/messages', socketController.getMessagesByChatId);
router.post('/groupid');

router.route('/')
  .get(authController.protect, (req, res) => {
    res.send('hello world');
  });

module.exports = router;
