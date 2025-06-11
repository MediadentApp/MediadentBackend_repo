import { ErrorCodeType } from '#src/types/api.response.error.js';
import { IResponseMessage } from '#src/types/api.response.messages.js';
import { MessageStatus, UserRole } from '#src/types/enum.js';
import { IUserAcademicDetails, IUserInterest } from '#src/types/request.userFormat.js';
import { Document, Model, Types } from 'mongoose';

export interface IUser extends Document<Types.ObjectId> {
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
  education?: Types.ObjectId;
  interests: string[];
  additionalInfo: {
    userType?: string;
    gender?: string;
    institute?: string;
    currentCity?: string;
  };
  bio: string;
  blockedUsers: Types.ObjectId[];
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
    chatIds: Types.ObjectId[];
    groupChatIds: Types.ObjectId[];
  };

  postsCount: number;
  followingCommunitiesCount: number;
  followingsCount: number;
  followersCount: number;
  savesCount: number;

  isFollowing?: boolean;

  isAdditionalInfoFilled(): {
    message: IResponseMessage;
    redirectUrl: string;
    errorCode: ErrorCodeType;
  } | null;
  correctPassword(candidatePassword: string, userPasswordInDB: string): Promise<boolean>;
  changedPasswordAfter(JwtTimestamp: number): boolean;
  createPasswordResetToken(): string;
}

export interface IUserModel extends Model<IUser> {
  findFullUser(query: object, additionalSelects?: string): Promise<IUser | null>;
  protectApi(token: string | null | undefined, selectFields?: string, populateFields?: string): Promise<IUser>;
}

export type UpdateUserDTO = {
  firstName?: string;
  lastName?: string;
  username?: string;
  profilePicture?: string | null;
  bio?: string;
  additionalInfo?: {
    userType?: string;
    gender?: string;
    institute?: string;
    currentCity?: string;
  };
  settings?: {
    notifications?: boolean;
    theme?: 'light' | 'dark';
  };
  blockedUsers?: Types.ObjectId[];
  contacts?: string[];
};

export interface IUserFollows extends Document {
  userId: Types.ObjectId; // user who follows
  followingUserId: Types.ObjectId; // user being followed
}

export interface IUserActivity extends Document {
  userId: Types.ObjectId;
  likedPosts: Types.ObjectId[];
  onlineStatus: boolean;
  lastSeen: Date;
  viewedPosts: {
    postId: Types.ObjectId;
    timestamp: Date;
  }[];
  dismissedPosts: Types.ObjectId[];
  commentedPosts: Types.ObjectId[];
  lastSuggestedAt: Date;
}

export interface ITempUser extends Document {
  email: string;
  otp?: number;
  otpSendAt?: Date;
  otpExpiration?: Date;
  emailVerified?: boolean;
  checkOtpTime(): boolean;
  checkOtp(otp: number): boolean;
  checkOtpExpiration(): boolean;
}

export interface IEducation extends Document {
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
  user: Types.ObjectId;
}

export interface ICollege {
  id?: Types.ObjectId;
  state: string;
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  district: string;
  pin_code: string;
}

export interface IUniversity {
  name: string;
  address: string;
  website: string;
  contact: string;
  vc: string;
  vcPhone: string;
  reg: string;
  regPhone: string;
}

export interface ICityStates {
  city: string;
  state: string;
}

export interface IMessage extends Document {
  chatId?: Types.ObjectId;
  groupChatId?: Types.ObjectId;
  senderId: Types.ObjectId;
  senderUsername: string;
  content: string;
  media?: {
    mediaType: {
      url: string;
      type: string;
      size: number;
    };
  };
  status: MessageStatus;
  reactions: {
    by: Types.ObjectId;
    reaction: string;
  }[];
  deleted: {
    status: boolean;
    by: Types.ObjectId | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IChat extends Document<Types.ObjectId> {
  participants: Types.ObjectId[];
  active: boolean;
  lastMessage: {
    senderId: Types.ObjectId;
    content: string;
    timestamp: Date;
  } | null;
  unreadCount: {
    userId: Types.ObjectId;
    count: number;
  }[];
}

export interface IGroupChat extends Document {
  groupName: string;
  groupPicture: string | null;
  participants: Types.ObjectId[];
  createdBy: Types.ObjectId;
  admins: Types.ObjectId[];
  lastMessage: {
    senderId: Types.ObjectId;
    content: string;
    timestamp: Date;
  } | null;
}

export interface IWebPushSubscription extends Document {
  userId: Types.ObjectId;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}

export interface INotification extends Document {
  userId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderName: string;
  senderUsername: string;
  type: 'newMessage' | 'newChat' | 'group_invite' | 'group_message' | 'mention' | 'other';
  relatedChatId?: Types.ObjectId;
  relatedGroupId?: Types.ObjectId;
  messageId?: Types.ObjectId;
  content: string;
  isRead: boolean;
  isPushSent: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserFormat extends Document {
  userType: string[];
  userAcademicDetails: IUserAcademicDetails;
  userGender: string[];
  userInterest: IUserInterest[];
}
