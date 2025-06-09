import {
  chats,
  deleteChatId,
  getChatID,
  getMessagesByChatId,
  getSecondParticipants,
  sendPushNotification,
  subscribe,
} from '#src/controllers/socketMessageController.js';
import {
  fetchUser,
  followUserToggle,
  getHomeFeed,
  getPopularFeed,
  updateUser,
  updateUserPicture,
  userById,
  userNotifications,
} from '#src/controllers/userController.js';
import { profileImageUpload } from '#src/middlewares/multerPosts.js';
import { AppRequestBody, AppRequestParams } from '#src/types/api.request.js';
import { AppResponse } from '#src/types/api.response.js';
import { UpdateUserDTO } from '#src/types/model.js';
import { IdParam } from '#src/types/param.js';
import express, { NextFunction } from 'express';

const router = express.Router();

/**
 * GET /
 * Returns the user's profile.
 */
router.get('/', fetchUser);

/**
 * PATCH /
 * Updates user's profile.
 */
router.patch('/', profileImageUpload, (req: AppRequestBody<UpdateUserDTO>, res: AppResponse, next: NextFunction) =>
  updateUser(req, res, next)
);

/**
 * PATCH /picture
 * Update user's profile picture
 */
router.patch(
  '/picture',
  profileImageUpload,
  (req: AppRequestBody<{ deletePicture: string }>, res: AppResponse, next: NextFunction) =>
    updateUserPicture(req, res, next)
);

/**
 * GET home/feed
 * Returns the user's home feed.
 */
router.get('/home/feed', getHomeFeed);

/**
 * GET /popular/feed
 * Returns the user's popular feed.
 */
router.get('/popular/feed', getPopularFeed);

/**
 * GET /notifications
 * Returns the user's notifications.
 */
router.get('/notifications', userNotifications);

router.post('/usersbyid', userById);
router.patch('/:id/follow/toggle', (req: AppRequestParams<IdParam>, res: AppResponse, next: NextFunction) =>
  followUserToggle(req, res, next)
);

// Communication System APIs
router.post('/getSecondParticipants', getSecondParticipants);
router.post('/chats', chats);
router.post('/chatid', getChatID);
router.delete('/chatid/:id', deleteChatId);
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
