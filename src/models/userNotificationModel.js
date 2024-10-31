const { default: mongoose } = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['message', 'newChat', 'group_invite', 'group_message', 'mention', 'other']
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

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;