const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const AppError = require('@src/utils/appError');
const config = require('@src/config/config');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const { Chat } = require('./userMessages');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please tell us your First Name!'],
    trim: true,
    validate: {
      validator: (value) => /^[a-zA-Z\s]*$/.test(value),
      message: 'First name can only contain letters and spaces'
    }
  },
  lastName: {
    type: String,
    required: [true, 'Please tell us your Last Name!'],
    trim: true,
    validate: {
      validator: (value) => /^[a-zA-Z\s]*$/.test(value),
      message: 'Last name can only contain letters and spaces'
    }
  },
  fullName: {
    type: String
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'], // From the Validator Module
    index: true
  },
  username: {
    type: String,
    unique: true,
    required: false,
    index: true
  },
  profilePicture: {
    type: String,
    validate: {
      validator: function (value) {
        return !value || validator.isURL(value, {
          protocols: ['http', 'https'],
          require_protocol: false
        });
      },
      message: 'Invalid URL format for profile picture'
    },
    default: null,
    required: false
  },
  password: {
    type: String,
    required: function () {
      return (!this.googleAccount && !this.githubAccount && !this.linkedinAccount); // Password is required only if googleAccount,etc is false
    },
    minLength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: function () {
      return (!this.googleAccount && !this.githubAccount && !this.linkedinAccount); // Password is required only if googleAccount,etc is false
    },
    validate: {
      // This will only work on CREATE & SAVE, and not on func like findOneAndUpdate, etc
      // Because mongoose doesn't keep the current obj in memory
      // So use SAVE on updating the password
      validator: function (value) {
        return value === this.password; //Should return either true or false
      },
      message: 'Passwords do not match'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  manualSignup: {
    type: Boolean,
    default: false
  },
  googleAccount: {
    type: Boolean,
    default: false
  },
  githubAccount: {
    type: Boolean,
    default: false
  },
  github_url: {
    type: String,
    required: function () { return this.githubAccount; },
    validate: {
      validator: validator.isURL,
      message: 'Please provide a valid URL for GitHub'
    }
  },
  linkedinAccount: {
    type: Boolean,
    default: false
  },
  education: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Education',
    required: false,
    default: null
  },
  interests: {
    type: [String],
    required: false,
    default: []
  },
  additionalInfo: {
    userType: {
      type: String,
      required: false,
    },
    gender: {
      type: String,
      required: false,
    },
    institute: {
      type: String,
      required: false,
    },
    currentCity: {
      type: String,
      required: false,
    }
  },
  bio: {
    type: String,
    default: '',
    trim: true,
    maxlength: 250
  },
  blockedUsers: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
    select: false,
  },
  settings: {
    notifications: {
      type: Boolean,
      default: true,  // Controls message notifications
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',  // User preference for light or dark theme
    },
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'deactivated'],
    default: 'active',  // To manage user account status
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  onlineStatus: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    select: false
  },
  // Array of userName representing the user’s contact/messageInbox list.
  contacts: {
    type: [String],
    select: false,
    validate: {
      validator: (contacts) => contacts.every(validator.isAlphanumeric),
      message: 'Contact list can only contain alphanumeric usernames'
    }
  },
  chats: {
    chatIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Chat',
      select: false,
      default: []
    },
    groupChatIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'GroupChat',
      select: false,
      default: []
    },
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  followingCommunities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community', // Reference to the Community model
    default: []
  }],
  followingUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }]
}, {
  timestamps: true,  // Automatically manages createdAt fields
});

// This will run between getting the data from client and saving it to DB
userSchema.pre('save', async function (next) {
  // Hash password if modified
  if (this.password && this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
    this.passwordConfirm = undefined;

    // Set passwordChangedAt if password is changed
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000; // Subtract 1 sec for DB save time
    }
  }

  this.email = validator.normalizeEmail(this.email, {
    all_lowercase: true,
    gmail_remove_dots: true,
  });

  if (!this?.fullName) {
    this.fullName = `${this.firstName} ${this.lastName}`;
  }

  // Generate username if not present
  if (!this.username) {
    const emailPrefix = this.email.split('@')[0];
    const uniqueSuffix = Math.floor(Math.random() * 10000); // Generate a unique suffix
    this.username = `${emailPrefix}-${uniqueSuffix}`;
  }

  next();
});

userSchema.pre('save', async function (next) {
  try {
    if (this.email === process.env.OWNER_EMAIL) {
      this.role = 'admin';
    }

    const admins = await User.find({ role: 'admin', _id: { $ne: this._id } });

    if (admins.length > 0) {
      const newChats = admins.map(admin => ({
        participants: [this._id, admin._id]
      }));

      const chatArr = await Chat.insertMany(newChats);
      const chatIds = chatArr.map(chat => chat._id);

      this.chats.chatIds = [...new Set([...this.chats?.chatIds, ...chatIds])];

      await User.updateMany(
        { role: 'admin' },
        { $addToSet: { 'chats.chatIds': { $each: chatIds } } }
      );
    }

    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.isAdditionalInfoFilled = function () {
  const { userType, gender, institute, currentCity } = this.additionalInfo || {};

  if (!userType || !gender || !institute || !currentCity) {
    return config.urls.signupAdditionalDetailsUrl;
  }

  return ((this.interests && (this.interests.length < config.app.numOfSignupInterests)) ? config.urls.signupInterestUrl : null);
};

userSchema.statics.protectApi = async function (token, selectFields = '-passwordChangedAt +chats.chatIds +chats.groupChatIds', populateFields) {
  if (!token) throw new AppError('You are not logged in', 401);

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const query = this.findById(decoded.id).select(selectFields);
  if (populateFields) query.populate(populateFields);

  const freshUser = await query.exec();
  if (!freshUser) throw new AppError('The user belonging to this token no longer exists', 401);

  if (freshUser.changedPasswordAfter(decoded.iat)) {
    throw new AppError('User recently changed the password! Please log in again', 401);
  }

  return freshUser;
};

userSchema.statics.findFullUser = function (query, additionalSelects = '') {
  const selectFields = '-passwordChangedAt +chats.chatIds +chats.groupChatIds ' + additionalSelects;

  return this.findOne(query).select(selectFields);
};

// This is Instance Method
// This method will be available on all document in the collection
// This is a method to check user's password (ex. on login)
userSchema.methods.correctPassword = async function (candidatePassword, userPasswordInDB) {
  return await bcrypt.compare(candidatePassword, userPasswordInDB);
};

userSchema.methods.changedPasswordAfter = function (JwtTimestamp) {
  if (this.passwordChangedAt) {
    // Getting timestamp in seconds
    const passwordChangeTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    // console.log(this.passwordChangedAt, JwtTimestamp);
    return JwtTimestamp < passwordChangeTimeStamp;
  }

  // False means NOT CHANGED
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // It is like a password to reset password
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //10mins
  // Your need to call save() after calling createPasswordResetToken() to save token and expiration
  // console.log({ resetToken }, this.passwordResetToken, this.passwordResetExpires);

  // Sending unencrypted reset token
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
