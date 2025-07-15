import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose, { Schema, CallbackWithoutResultAndOptionalError, Types } from 'mongoose';
import validator from 'validator';

import { IUser, IUserModel } from '#src/types/model.js';
import ApiError from '#src/utils/ApiError.js';
import { Chat } from '#src/models/userMessages.js';
import appConfig from '#src/config/appConfig.js';
import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import { ErrorCodeType } from '#src/types/api.response.error.js';
import { IResponseMessage } from '#src/types/api.response.messages.js';
import { UserRole, UserType } from '#src/types/enum.js';

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
        enum: UserType,
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
      enum: UserRole,
      default: UserRole.User,
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
        validator: (contacts: string[]) => contacts.every(str => validator.isAlphanumeric(str)),
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

userSchema.pre<IUser>('save', async function (next: CallbackWithoutResultAndOptionalError) {
  // Hash password if modified
  if (this.password && this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, appConfig.bycryptHashSalt);
    this.passwordConfirm = undefined;

    // Set passwordChangedAt if password is changed
    if (!this.isNew) {
      this.passwordChangedAt = new Date(Date.now() - 1000); // Subtract 1 sec for DB save time
    }
  }

  if (!this._id) {
    const normalizedEmail = validator.normalizeEmail(this.email, {
      all_lowercase: true,
      gmail_remove_dots: true,
    });
    if (normalizedEmail) {
      this.email = normalizedEmail;
    } else {
      throw new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.INVALID_EMAIL);
    }
  }

  this.fullName = `${this.firstName} ${this.lastName}`;

  // Generate username if not present
  if (!this.username) {
    const emailPrefix = this.email.split('@')[0];
    const uniqueSuffix = Math.floor(Math.random() * 10000); // Generate a unique suffix
    this.username = `${emailPrefix}-${uniqueSuffix}`;
  }

  next();
});

/**
 * Adds admin role to the owner
 * Connects new Users to all admins
 */
userSchema.pre<IUser>('save', async function (next) {
  try {
    if (!this._id) {
      if (this.email === process.env.OWNER_EMAIL) {
        this.role = UserRole.Admin;
      }

      const admins = await User.find({ role: UserRole.Admin, _id: { $ne: this._id } });

      if (admins.length > 0) {
        const newChats = admins.map(admin => ({
          participants: [this._id, admin._id],
        }));

        const chatArr = await Chat.insertMany(newChats);
        const chatIds = chatArr.map(chat => chat._id);

        this.chats = this.chats || {};
        this.chats.chatIds = [...new Set([...(this.chats.chatIds || []), ...chatIds])] as Types.ObjectId[];

        await User.updateMany({ role: UserRole.Admin }, { $addToSet: { 'chats.chatIds': { $each: chatIds } } });
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// This is an Instance Method
userSchema.methods.isAdditionalInfoFilled = function (): {
  message: IResponseMessage;
  redirectUrl: string;
  errorCode: ErrorCodeType;
} | null {
  const { userType, gender, institute, currentCity } = this.additionalInfo || {};

  if (!userType || !gender || !institute || !currentCity) {
    return {
      redirectUrl: appConfig.urls.signupAdditionalDetailsUrl,
      message: responseMessages.AUTH.REDIRECT_TO_DETAILS,
      errorCode: ErrorCodes.SIGNUP.REDIRECT_TO_DETAILS,
    };
  }

  return this.interests && this.interests.length < appConfig.app.signup.numOfSignupInterests
    ? {
        redirectUrl: appConfig.urls.signupInterestUrl,
        message: responseMessages.AUTH.REDIRECT_TO_INTERESTS,
        errorCode: ErrorCodes.SIGNUP.REDIRECT_TO_INTERESTS,
      }
    : null;
};

userSchema.statics.protectApi = async function (
  token: string | undefined | null,
  selectFields: string = '',
  populateFields?: string
): Promise<IUser> {
  selectFields = selectFields + ' ' + '+chats.chatIds +chats.groupChatIds';
  const redirect = appConfig.urls.loginUrl;

  if (!token) throw new ApiError(responseMessages.AUTH.NO_TOKEN, 401, ErrorCodes.SIGNUP.REDIRECT_TO_LOGIN, redirect);

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
  if (typeof decoded !== 'object' || decoded === null || !('id' in decoded)) {
    throw new ApiError(responseMessages.AUTH.INVALID_TOKEN, 401, ErrorCodes.SIGNUP.REDIRECT_TO_LOGIN, redirect);
  }

  const query = this.findById(decoded.id).select(selectFields);
  if (populateFields) query.populate(populateFields);

  const freshUser = await query.exec();
  if (!freshUser || freshUser.changedPasswordAfter(decoded.iat)) {
    throw new ApiError(responseMessages.AUTH.INVALID_TOKEN, 401, ErrorCodes.SIGNUP.REDIRECT_TO_LOGIN, redirect);
  }

  return freshUser;
};

userSchema.statics.findFullUser = function (query: object, additionalSelects = '') {
  const selectFields = `-passwordChangedAt +chats.chatIds +chats.groupChatIds ${additionalSelects}`;

  return this.findOne(query).select(selectFields);
};

// This is an Instance Method to check user's password (e.g. on login)
userSchema.methods.correctPassword = async function (
  candidatePassword: string,
  userPasswordInDB: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, userPasswordInDB);
};

userSchema.methods.changedPasswordAfter = function (JwtTimestamp: number): boolean {
  if (this.passwordChangedAt) {
    const passwordChangeTimeStamp = this.passwordChangedAt.getTime() / 1000;
    return JwtTimestamp < passwordChangeTimeStamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  this.passwordResetExpires = Date.now() + appConfig.app.signup.passwordResetTokenExpiration;
  return resetToken;
};

const User: IUserModel = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;
