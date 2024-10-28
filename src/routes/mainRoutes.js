const express = require('express');
const authController = require('../controllers/authController');
const socketController = require('@src/controllers/socketMessageController');
const userController = require('@src/controllers/userController');

const router = express.Router();

router.post('/usersbyid', userController.userById);

// ?Communication System apis
router.post('/getSecondParticipants', socketController.getSecondParticipants);
router.post('/chats', socketController.chats);
router.post('/chatid', socketController.getChatID);
router.post('/messages', socketController.getMessagesByChatId);
router.post('/groupid');

router.post("/subscribe", socketController.subscribe);
router.post("/send-notification", async (req, res) => {
  const { userId, message } = req.body;
  await sendNotification(userId, message);
  res.status(200).json({ message: "Notification sent" });
});

router.route('/')
  .get(authController.protect, (req, res) => {
    res.send('hello world');
  });

module.exports = router;
