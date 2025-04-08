import { protect } from '#src/controllers/authController.js';
import {
  chats,
  getChatID,
  getMessagesByChatId,
  getSecondParticipants,
  sendPushNotification,
  subscribe,
} from '#src/controllers/socketMessageController.js';
import {
  userById,
  userNotifications,
} from '#src/controllers/userController.js';
import express from 'express';

const router = express.Router();

router.post('/usersbyid', userById);
router.get('/notifications', userNotifications);

// Communication System APIs
router.post('/getSecondParticipants', getSecondParticipants);
router.post('/chats', chats);
router.post('/chatid', getChatID);
router.post('/messages', getMessagesByChatId);

// Placeholder route (Missing controller logic)
router.post('/groupid', (req, res) => {
  res.status(501).json({ message: 'Not Implemented' });
});

router.post('/subscribe', subscribe);

router.post('/send-notification', async (req, res) => {
  try {
    const { userId, message } = req.body;
    await sendPushNotification(userId, message);
    res.status(200).json({ message: 'Notification sent' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send notification', error });
  }
});

router.get('/', protect, (req, res) => {
  res.send('hello world');
});

export { router as mainRoutes };
