import { INotification } from '#src/types/model.js';
import mongoose, { Schema, Document } from 'mongoose';

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    senderUsername: {
      type: String,
    },
    senderName: {
      type: String,
    },
    type: {
      type: String,
      required: true,
      enum: ['newMessage', 'newChat', 'follow', 'group_invite', 'group_message', 'mention', 'other'],
    },
    relatedChatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
    },
    relatedGroupId: {
      type: Schema.Types.ObjectId,
      ref: 'GroupChat',
      default: null,
    },
    messageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    content: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isPushSent: {
      type: Boolean,
      default: false, // Indicates if the notification has been sent as a web push notification
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
