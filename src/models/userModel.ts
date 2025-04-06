import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose, { Schema, Document, Model } from 'mongoose';
import validator from 'validator';

import { Chat } from './userMessages'; // Assuming the Chat model is imported from userMessages

// Interface for the User document
interface IUser extends Document {
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  username?: string;
  profilePicture?: string | null;
  password?: string;
  passwordConfirm?: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  manualSignup: boolean;
  googleAccount: boolean;
  githubAccount: boolean;
  github_url?: string;
  linkedinAccount: boolean;
  education?: mongoose.Types.ObjectId;
  interests: string[];
  additionalInfo: {
    userType?: string;
    gender?: string;
    institute?: string;
    currentCity?: string;
  };
  bio: string;
  blockedUsers: mongoose.Types.ObjectId[];
  settings: {
    notifications: boolean;
    theme: 'light' | 'dark';
  };
  accountStatus: 'active' | 'suspended' | 'deactivated';
  role: 'user' | 'moderator' | 'admin';
  createdAt: Date;
  onlineStatus: boolean;
  lastSeen?: Date;
  contacts: string[];
  chats: {
    chatIds: mongoose.Types.ObjectId[];
    groupChatIds: mongoose.Types.ObjectId[];
  };
  updatedAt: Date;
  followingCommunities: mongoose.Types.ObjectId[];
  followingUsers: mongoose.Types.ObjectId[];
  followers: mongoose.Types.ObjectId[];
}

// User schema definition
const userSchema: Schema<IUser> = new Schema(
  {
    firstName: {
      type: String,
      required: [true, 'Please tell us your First Name!'],
      trim: true,
      validate: {
        validator: (value: string) => /^[a-zA-Z\s]*$/.test(value),
        message: 'First name can only contain letters and spaces',
      },
    },
    lastName: {
      type: String,
      required: [true, 'Please tell us your Last Name!'],
      trim: true,
      validate: {
        validator: (value: string) => /^[a-zA-Z\s]*$/.test(value),
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
        validator(value: string) {
          return !value || validator.isURL(value, { protocols: ['http', 'https'], require_protocol: false });
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
        validator(value: string) {
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
      select: false,
    },
    contacts: {
      type: [String],
      select: false,
      validate: {
        validator: (contacts: string[]) => contacts.every(validator.isAlphanumeric),
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
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    followingCommunities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Community',
        default: [],
      },
    ],
    followingUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
  },
  {
    timestamps: true, // Automatically manages createdAt fields
  }
);

userSchema.pre < IUser > ('save', async function (next: NextFunction) {
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

userSchema.pre < IUser > ('save', async function (next: NextFunction) {
  try {
    if (this.email === process.env.OWNER_EMAIL) {
      this.role = 'admin';
    }

    const admins = await User.find({ role: 'admin', _id: { $ne: this._id } });

    if (admins.length > 0) {
      const newChats = admins.map((admin) => ({
        participants: [this._id, admin._id],
      }));

      const chatArr = await Chat.insertMany(newChats);
      const chatIds = chatArr.map((chat) => chat._id);

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

// This is an Instance Method
userSchema.methods.isAdditionalInfoFilled = function (): string | null {
  const {
    userType, gender, institute, currentCity
  } = this.additionalInfo || {};

  if (!userType || !gender || !institute || !currentCity) {
    return config.urls.signupAdditionalDetailsUrl;
  }

  return ((this.interests && this.interests.length < config.app.numOfSignupInterests)
    ? config.urls.signupInterestUrl
    : null);
};

userSchema.statics.protectApi = async function (token: string, selectFields = '-passwordChangedAt +chats.chatIds +chats.groupChatIds', populateFields?: string) {
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

userSchema.statics.findFullUser = function (query: object, additionalSelects = '') {
  const selectFields = `-passwordChangedAt +chats.chatIds +chats.groupChatIds ${additionalSelects}`;

  return this.findOne(query).select(selectFields);
};

// This is an Instance Method to check user's password (e.g. on login)
userSchema.methods.correctPassword = async function (candidatePassword: string, userPasswordInDB: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, userPasswordInDB);
};

userSchema.methods.changedPasswordAfter = function (JwtTimestamp: number): boolean {
  if (this.passwordChangedAt) {
    const passwordChangeTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JwtTimestamp < passwordChangeTimeStamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 mins
  return resetToken;
};

const User: Model<IUser> = mongoose.model < IUser > ('User', userSchema);

export { User };
