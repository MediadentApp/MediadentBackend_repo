import { IMessage, IUser } from '#src/types/model.js';
import { Types } from 'mongoose';
import { Socket } from 'socket.io';

export interface IAuthenticatedSocket extends Socket {
  user: IUser;
  currentChatRoom?: string | null;
}

export interface IMessageData extends Partial<IMessage> {
  localId: string;
  content: any;
  recipientId: Types.ObjectId;
}

export type INotificationType = 'newMessage' | 'newChat' | 'group_invite' | 'group_message' | 'mention' | 'other';

export interface IUserB {
  userBId: string;
  type: INotificationType;
  notificationId: string;
}

export interface IReadNotification {
  userId: string;
  userBId?: string;
  type?: INotificationType;
  notificationId?: string;
}

export interface IChatRequestBody {
  userBId: Types.ObjectId;
  chatId?: Types.ObjectId | null;
}

export interface IGroupChatRequestBody {
  groupId?: string;
  groupName: string;
  participants: string[];
  admins?: string[];
  groupPicture?: string;
}

export interface ILeaveGroupChatRequestBody {
  groupId: string;
}

export interface INotificationPayload {
  userId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  type: string;
  relatedChatId: string;
  content: string;
  isRead: boolean;
}

export interface ISecondParticipantResponse {
  chatId: Types.ObjectId;
  secondParticipant: {
    _id: Types.ObjectId;
    profilePicture: string;
    firstName: string;
    lastName: string;
    fullName: string;
    username: string;
    email: string;
  };
}

export interface IChatRequestBody {
  userBId: Types.ObjectId;
  chatId?: Types.ObjectId | null;
}

export interface IGetMessagesRequestBody {
  chatId: string;
  oldestMessageDate?: string;
}

export interface IReadNotificationProp {
  io: Socket;
}
