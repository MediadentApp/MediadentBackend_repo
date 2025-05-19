import { Types } from 'mongoose';

export const createMockPostSave = (postId: string | Types.ObjectId, userId: string | Types.ObjectId) => ({
  postId,
  userId,
});
