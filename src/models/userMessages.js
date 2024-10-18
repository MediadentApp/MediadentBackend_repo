const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: { type: String, required: true, index: true },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [function () {
      return !this.groupId;
    }, 'Receiver ID not provided'],
    default: null
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupMessage',
    default: null,
    required: [function () {
      return !this.receiverId;
    }, 'Group ID not provided'],
  },
  content: { type: String, required: true },
  media: {
    mediaType: {
      url: String,
      type: String, // e.g., 'image/jpeg', 'video/mp4'
      size: Number
    }
  },
  timestamp: { type: Date, default: Date.now },
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
    required: true
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
    default: null // Store last message details
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
    required: true
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
    ref: 'Message',
    required: true // Ensure each notification is linked to a message
  },
  content: {
    type: String,
    required: true // Brief description of the notification
  },
  read: {
    type: Boolean,
    default: false // Indicates if the notification has been read
  },
  timestamp: {
    type: Date,
    default: Date.now // Timestamp for when the notification was created
  }
}, {
  timestamps: true
});
const MessageNotification = mongoose.model('MessageNotification', messageNotificationSchema);

module.exports = {
  Message,
  Chat,
  GroupChat,
  MessageNotification
};