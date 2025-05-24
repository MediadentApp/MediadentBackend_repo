import responseMessages from '#src/config/constants/responseMessages.js';
import User from '#src/models/userModel.js';
import ApiError from '#src/utils/ApiError.js';
import { Socket } from 'socket.io';
import { IAuthenticatedSocket } from '#src/types/request.socket.js';
import { extractSignedCookie } from '#src/utils/authUtils.js';

const socketAuthCheck = async (socket: Socket, next: (err?: any) => void) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;

    if (!cookieHeader) throw new ApiError(responseMessages.AUTH.NO_TOKEN, 401);

    const cookies = extractSignedCookie(cookieHeader);
    let token = cookies['token'];

    if (!token) throw new ApiError(responseMessages.AUTH.NO_TOKEN, 401);

    const user = await User.protectApi(token, 'firstName lastName fullName email username');

    (socket as IAuthenticatedSocket).user = user;

    next();
  } catch (err) {
    console.error('Authentication error:', err);
    const error = err instanceof Error ? err : new Error('Unknown error');
    (error as any).data = { content: 'Please retry later' };
    next(error);
  }
};

export default socketAuthCheck;