import mongoose, { Schema } from 'mongoose';
import validator from 'validator';
// User schema definition
const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, 'Please tell us your First Name!'],
      trim: true,
      validate: {
        validator: value => /^[a-zA-Z\s]*$/.test(value),
        message: 'First name can only contain letters and spaces',
      },
    },
    lastName: {
      type: String,
      required: [true, 'Please tell us your Last Name!'],
      trim: true,
      validate: {
        validator: value => /^[a-zA-Z\s]*$/.test(value),
        message: 'Last name can only contain letters and spaces',
      },
    },
    fullName: {
      type: String,
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
      index: true,
    },
    username: {
      type: String,
      unique: true,
      required: false,
      index: true,
    },
    profilePicture: {
      type: String,
      validate: {
        validator(value) {
          return (
            !value ||
            validator.isURL(value, {
              protocols: ['http', 'https'],
              require_protocol: false,
            })
          );
        },
        message: 'Invalid URL format for profile picture',
      },
      default: null,
      required: false,
    },
    password: {
      type: String,
      required() {
        return !this.googleAccount && !this.githubAccount && !this.linkedinAccount;
      },
      minLength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required() {
        return !this.googleAccount && !this.githubAccount && !this.linkedinAccount;
      },
      validate: {
        validator(value) {
          return value === this.password;
        },
        message: 'Passwords do not match',
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    manualSignup: {
      type: Boolean,
      default: false,
    },
    googleAccount: {
      type: Boolean,
      default: false,
    },
    githubAccount: {
      type: Boolean,
      default: false,
    },
    github_url: {
      type: String,
      required() {
        return this.githubAccount;
      },
      validate: {
        validator: validator.isURL,
        message: 'Please provide a valid URL for GitHub',
      },
    },
    linkedinAccount: {
      type: Boolean,
      default: false,
    },
    education: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Education',
      required: false,
      default: null,
    },
    interests: {
      type: [String],
      required: false,
      default: [],
    },
    additionalInfo: {
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
      },
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: 250,
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
        default: true,
      },
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light',
      },
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'deactivated'],
      default: 'active',
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
      select: false,
    },
    contacts: {
      type: [String],
      select: false,
      validate: {
        validator: contacts => contacts.every(str => validator.isAlphanumeric(str)),
        message: 'Contact list can only contain alphanumeric usernames',
      },
    },
    chats: {
      chatIds: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Chat',
        select: false,
        default: [],
      },
      groupChatIds: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'GroupChat',
        select: false,
        default: [],
      },
    },
    postsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    followingCommunitiesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    followingsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    followersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    savesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt fields
  }
);

const User = mongoose.model('User', userSchema);
export default User;
