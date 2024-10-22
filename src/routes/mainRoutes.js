const express = require('express');
const authController = require('../controllers/authController');
const socketController = require('@src/controllers/socketMessageController');
const userController = require('@src/controllers/userController');

const router = express.Router();

router.post('/getSecondParticipants', userController.getSecondParticipants);
router.post('/usersbyid', userController.userById);

// ?Communication System apis
router.post('/chats', userController.chats);
router.post('/chatid', socketController.chatID);
router.post('/messages', socketController.getMessagesByChatId);
router.post('/groupid');

router.route('/')
  .get(authController.protect, (req, res) => {
    res.send('hello world');
  });

module.exports = router;
