const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: [function () {
      return !this.groupChatId;
    }, 'ChatIds is required'],
    index: true
  },
  groupChatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupChat',
    required: [function () {
      return !this.chatId;
    }, 'groupChatIds is required'],
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderUsername: {
    type: String,
    required: true
  },
  content: { type: String, required: true },
  media: {
    mediaType: {
      url: String,
      type: String, // e.g., 'image/jpeg', 'video/mp4'
      size: Number
    }
  },
  status: {
    sent: { type: Boolean, default: false },
    delivered: { type: Boolean, default: false },
    read: { type: Boolean, default: false },
  },
  reactions: [{
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reaction: String
  }],
  deleted: {
    status: {
      type: Boolean,
      default: false
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  }
}, {
  timestamps: true // Automatically manages createdAt fields
});
const Message = mongoose.model('Message', messageSchema);

const chatSchema = new mongoose.Schema({
  participants: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    required: true,
    validate: {
      validator: function (arr) {
        return arr.length === 2;
      },
      message: 'Participants array must have exactly 2 elements.'
    },
    index: true
  },
  lastMessage: {
    type: {
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      content: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    default: null
  },
  unreadCount: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    count: {
      type: Number,
      default: 0
    }
  }],
}, {
  timestamps: true
});
const Chat = mongoose.model('Chat', chatSchema);

const groupChatSchema = new mongoose.Schema({
  groupName: {
    type: String,
    required: true
  },
  groupPicture: {
    type: String,
    default: null
  },
  participants: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    required: true,
    default: [] // Initially empty, populate later
  },
  lastMessage: {
    type: {
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      content: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    default: null
  },
}, {
  timestamps: true
});
const GroupChat = mongoose.model('GroupChat', groupChatSchema);

const messageNotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['message', 'group_invite', 'group_message', 'mention', 'other'],
  },
  relatedChatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
  },
  relatedGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupChat',
    default: null
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  content: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isPushSent: {
    type: Boolean,
    default: false  // Indicates if the notification has been sent as a web push notification
  }
}, {
  timestamps: true
});
const MessageNotification = mongoose.model('MessageNotification', messageNotificationSchema);

const webPushSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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
}, {
  timestamps: true
});
const WebPushSubscription = mongoose.model('WebPushSubscription', webPushSubscriptionSchema);

module.exports = {
  Message,
  Chat,
  GroupChat,
  MessageNotification,
  WebPushSubscription
};