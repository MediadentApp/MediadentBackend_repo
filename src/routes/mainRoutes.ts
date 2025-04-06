import { sendNotification } from '@src/utils/notificationService'; // Assuming this exists
import express from 'express';

import authController from '@src/controllers/authController';
import socketController from '@src/controllers/socketMessageController';
import userController from '@src/controllers/userController';

const router = express.Router();

router.post('/usersbyid', userController.userById);
router.get('/notifications', userController.userNotifications);

// Communication System APIs
router.post('/getSecondParticipants', socketController.getSecondParticipants);
router.post('/chats', socketController.chats);
router.post('/chatid', socketController.getChatID);
router.post('/messages', socketController.getMessagesByChatId);

// Placeholder route (Missing controller logic)
router.post('/groupid', (req, res) => {
  res.status(501).json({ message: 'Not Implemented' });
});

router.post('/subscribe', socketController.subscribe);

router.post('/send-notification', async (req, res) => {
  try {
    const { userId, message } = req.body;
    await sendNotification(userId, message);
    res.status(200).json({ message: 'Notification sent' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send notification', error });
  }
});

router.get('/', authController.protect, (req, res) => {
  res.send('hello world');
});

export default router;
