import { ErrorCodeType } from '#src/types/api.response.error.js';
import { IResponseMessage } from '#src/types/api.response.messages.js';
import { UserRole } from '#src/types/enum.js';
import { IUserAcademicDetails, IUserInterest } from '#src/types/request.userFormat.js';
import { Document, Model, ObjectId } from 'mongoose';

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
  education?: ObjectId;
  interests: string[];
  additionalInfo: {
    userType?: string;
    gender?: string;
    institute?: string;
    currentCity?: string;
  };
  bio: string;
  blockedUsers: ObjectId[];
  settings: {
    notifications: boolean;
    theme: 'light' | 'dark';
  };
  accountStatus: 'active' | 'suspended' | 'deactivated';
  role: UserRole;
  createdAt: Date;
  onlineStatus: boolean;
  lastSeen?: Date;
  contacts: string[];
  chats: {
    chatIds: ObjectId[];
    groupChatIds: ObjectId[];
  };
  updatedAt: Date;
  followingCommunities: ObjectId[];
  followingUsers: ObjectId[];
  followers: ObjectId[];
  isAdditionalInfoFilled(): {
    message: IResponseMessage;
    redirectUrl: string;
    errorCode: ErrorCodeType;
  } | null;
  correctPassword(candidatePassword: string, userPasswordInDB: string): Promise<boolean>;
  changedPasswordAfter(JwtTimestamp: number): boolean;
  createPasswordResetToken(): string;
}

interface IUserModel extends Model<IUser> {
  findFullUser(query: object, additionalSelects?: string): Promise<IUser | null>;
  protectApi(token: string | null | undefined, selectFields?: string, populateFields?: string): Promise<IUser>;
}

interface IUserActivity extends Document {
  userId: ObjectId;
  likedPosts: ObjectId[];
  onlineStatus: boolean;
  lastSeen: Date;
  viewedPosts: {
    postId: ObjectId;
    timestamp: Date;
  }[];
  dismissedPosts: ObjectId[];
  commentedPosts: ObjectId[];
  lastSuggestedAt: Date;
}

interface ITempUser extends Document {
  email: string;
  otp?: number;
  otpSendAt?: Date;
  otpExpiration?: Date;
  emailVerified?: boolean;
  checkOtpTime(): boolean;
  checkOtp(otp: number): boolean;
  checkOtpExpiration(): boolean;
}

interface IEducation extends Document {
  country: string;
  state: string;
  city: string;
  school: {
    name: string;
    board: string;
    passoutYear: string;
    marks: number;
  };
  juniorCollege: {
    name: string;
    board: string;
    passoutYear: string;
    stream: string;
  };
  seniorCollege: {
    name: string;
    university: string;
    degree: string;
    fieldOfStudy: string;
    startYear: string;
    completionYear: string;
    gpa?: number;
  };
  externalExams: {
    examName: string;
    year: string;
    score?: number;
    rank?: number;
  }[];
  extracurriculars?: string[];
  certifications?: string[];
  projects?: string[];
  internships?: string[];
  user: ObjectId;
}

interface ICollege {
  id?: ObjectId;
  state: string;
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  district: string;
  pin_code: string;
}

interface IUniversity {
  name: string;
  address: string;
  website: string;
  contact: string;
  vc: string;
  vcPhone: string;
  reg: string;
  regPhone: string;
}

interface ICityStates {
  city: string;
  state: string;
}

interface IMessage extends Document {
  chatId?: ObjectId;
  groupChatId?: ObjectId;
  senderId: ObjectId;
  senderUsername: string;
  content: string;
  media?: {
    mediaType: {
      url: string;
      type: string;
      size: number;
    };
  };
  status: {
    sent: boolean;
    delivered: boolean;
    read: boolean;
  };
  reactions: {
    by: ObjectId;
    reaction: string;
  }[];
  deleted: {
    status: boolean;
    by: ObjectId | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface IChat extends Document {
  participants: ObjectId[];
  active: boolean;
  lastMessage: {
    senderId: ObjectId;
    content: string;
    timestamp: Date;
  } | null;
  unreadCount: {
    userId: ObjectId;
    count: number;
  }[];
}

interface IGroupChat extends Document {
  groupName: string;
  groupPicture: string | null;
  participants: ObjectId[];
  createdBy: ObjectId;
  admins: ObjectId[];
  lastMessage: {
    senderId: ObjectId;
    content: string;
    timestamp: Date;
  } | null;
}

interface IWebPushSubscription extends Document {
  userId: ObjectId;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}

interface INotification extends Document {
  userId: ObjectId;
  senderId: ObjectId;
  senderName: string;
  senderUsername: string;
  type: 'newMessage' | 'newChat' | 'group_invite' | 'group_message' | 'mention' | 'other';
  relatedChatId?: ObjectId;
  relatedGroupId?: ObjectId;
  messageId?: ObjectId;
  content: string;
  isRead: boolean;
  isPushSent: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IUserFormat extends Document {
  userType: string[];
  userAcademicDetails: IUserAcademicDetails;
  userGender: string[];
  userInterest: IUserInterest[];
}

export type {
  IUser,
  IUserModel,
  IUserActivity,
  ITempUser,
  IEducation,
  ICollege,
  IUniversity,
  ICityStates,
  IMessage,
  IChat,
  IGroupChat,
  IWebPushSubscription,
  INotification,
  IUserFormat,
};
