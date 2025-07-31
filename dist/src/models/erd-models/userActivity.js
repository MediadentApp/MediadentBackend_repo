import mongoose, { Schema } from 'mongoose';
const userActivitySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    onlineStatus: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      select: false,
    },
    viewedPosts: {
      type: [
        {
          postId: {
            type: Schema.Types.ObjectId,
            ref: 'Post',
            required: true,
          },
          timestamp: {
            type: Date,
            required: true,
          },
        },
      ],
      select: false,
    },
    dismissedPosts: {
      type: [Schema.Types.ObjectId],
      ref: 'Post',
      select: false,
    },
    commentedPosts: {
      type: [Schema.Types.ObjectId],
      ref: 'Post',
      select: false,
    },
    lastSuggestedAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);
const UserActivity = mongoose.model('UserActivity', userActivitySchema);
export default UserActivity;
