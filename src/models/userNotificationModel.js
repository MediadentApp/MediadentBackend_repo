const { default: mongoose } = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  senderFullName: {
    type: String,
    set: function () {
      return this.firstName + ' ' + this.lastName;
    }
  },
  senderUsername: {
    type: String
  },
  senderName: {
    type: String,
  },
  type: {
    type: String,
    required: true,
    enum: ['newMessage', 'newChat', 'group_invite', 'group_message', 'mention', 'other']
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

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;