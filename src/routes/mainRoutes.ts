import { createCommunity, communityPosts } from '#src/controllers/postController.js';
import {
  chats,
  getChatID,
  getMessagesByChatId,
  getSecondParticipants,
  sendPushNotification,
  subscribe,
} from '#src/controllers/socketMessageController.js';
import { userById, userNotifications } from '#src/controllers/userController.js';
import { communityCreationUpload, postUpload } from '#src/middlewares/multerPosts.js';
import express from 'express';

const router = express.Router();

router.post('/usersbyid', userById);
router.get('/notifications', userNotifications);

// Post APIs
router.post('/community', communityCreationUpload, createCommunity);
router.post('/communitypost', postUpload, communityPosts);

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

export { router as mainRoutes };
