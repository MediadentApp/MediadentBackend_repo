import { Types } from 'mongoose';

/**
 * Creates a mock post view object.
 *
 * @param postId - The ID of the post being viewed.
 * @param userId - The ID of the user viewing the post.
 * @returns An object representing a post view with the specified postId, userId,
 *          and the current date as the viewedAt timestamp.
 */
export const createMockPostView = (postId: string | Types.ObjectId, userId: string | Types.ObjectId) => ({
  postId,
  userId,
  viewedAt: new Date(),
});
