import {
  IChat,
  IGroupChat,
  IMessage,
  IWebPushSubscription,
} from '#src/types/model.js';
import mongoose, { Schema, Model } from 'mongoose';

const messageSchema = new Schema<IMessage>(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: [
        function () {
          return !this.groupChatId;
        },
        'ChatIds is required',
      ],
      index: true,
    },
    groupChatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GroupChat',
      required: [
        function () {
          return !this.chatId;
        },
        'groupChatIds is required',
      ],
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderUsername: {
      type: String,
      required: true,
    },
    content: { type: String, required: true },
    media: {
      mediaType: {
        url: String,
        type: String, // e.g., 'image/jpeg', 'video/mp4'
        size: Number,
      },
    },
    status: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
    },
    reactions: [
      {
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reaction: String,
      },
    ],
    deleted: {
      status: {
        type: Boolean,
        default: false,
      },
      by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

const Message: Model<IMessage> = mongoose.model<IMessage>(
  'Message',
  messageSchema
);

const chatSchema = new Schema<IChat>(
  {
    participants: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      required: true,
      validate: {
        validator(arr) {
          return arr.length === 2;
        },
        message: 'Participants array must have exactly 2 elements.',
      },
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    lastMessage: {
      type: {
        senderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
        },
      },
      default: null,
    },
    unreadCount: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        count: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Chat: Model<IChat> = mongoose.model<IChat>('Chat', chatSchema);

const groupChatSchema: Schema<IGroupChat> = new Schema(
  {
    groupName: {
      type: String,
      required: true,
    },
    groupPicture: {
      type: String,
      default: null,
    },
    participants: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    admins: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      required: true,
      default: [], // Initially empty, populate later
    },
    lastMessage: {
      type: {
        senderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const GroupChat = mongoose.model<IGroupChat>('GroupChat', groupChatSchema);

const webPushSubscriptionSchema = new Schema<IWebPushSubscription>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subscription: {
      endpoint: {
        type: String,
        required: true,
      },
      keys: {
        p256dh: {
          type: String,
          required: true,
        },
        auth: {
          type: String,
          required: true,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

const WebPushSubscription: Model<IWebPushSubscription> =
  mongoose.model<IWebPushSubscription>(
    'WebPushSubscription',
    webPushSubscriptionSchema
  );

export { Message, Chat, GroupChat, WebPushSubscription };
