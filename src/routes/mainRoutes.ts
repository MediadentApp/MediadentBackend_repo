import { getUserComments } from '#src/controllers/comments.controller.js';
import {
  getDownvotedPosts,
  getSavedPosts,
  getUpvotedPosts,
  getUserPosts,
} from '#src/controllers/communityPost.controller.js';
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
  getUserByIdentifier,
  userNotifications,
  searchUsers,
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
 * GET /user/:identifier
 * Returns a user by their identifier(id/username).
 */
router.get('/details/:identifier', getUserByIdentifier);

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
 * GET /search
 * Returns the user's popular feed.
 */
router.get('/search', searchUsers);

/**
 * GET /posts
 * Returns the user's posts.
 */
router.get('/posts', getUserPosts);
router.get('/posts/:id', getUserPosts);

/**
 * GET /saved
 * Returns the user's saved posts.
 */
router.get('/saved', getSavedPosts);

/**
 * GET /commets
 * Returns the user's saved posts.
 */
router.get('/comments/:id', getUserComments);
router.get('/comments', getUserComments);

/**
 * GET /voted posts
 * Returns the user's voted posts.
 */
router.get('/upvoted', getUpvotedPosts);
router.get('/downvoted', getDownvotedPosts);

/**
 * GET /notifications
 * Returns the user's notifications.
 */
router.get('/notifications', userNotifications);

/**
 * PATCH /:id/follow/toggle
 * Toggles following a user.
 */
router.patch('/:id/follow/toggle', (req: AppRequestParams<IdParam>, res: AppResponse, next: NextFunction) =>
  followUserToggle(req, res, next)
);

// Communication System APIs
router.post('/getSecondParticipants', getSecondParticipants);
router.post('/chats', chats);

/**
 * GET /chat
 * Creates a new chat by userBId in body, or finds an existing chat by chatId
 */
router.post('/chat', getChatID);
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
