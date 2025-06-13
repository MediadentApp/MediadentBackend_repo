import responseMessages from '../config/constants/responseMessages.js';
import User from '../models/userModel.js';
import ApiError from '../utils/ApiError.js';
import { extractSignedCookie } from '../utils/authUtils.js';
const socketAuthCheck = async (socket, next) => {
    try {
        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader)
            throw new ApiError(responseMessages.AUTH.NO_TOKEN, 401);
        const cookies = extractSignedCookie(cookieHeader);
        let token = cookies['token'];
        if (!token)
            throw new ApiError(responseMessages.AUTH.NO_TOKEN, 401);
        const user = await User.protectApi(token, 'firstName lastName fullName email username');
        socket.user = user;
        next();
    }
    catch (err) {
        console.error('Authentication error:', err);
        const error = err instanceof Error ? err : new Error('Unknown error');
        error.data = { content: 'Please retry later' };
        next(error);
    }
};
export default socketAuthCheck;
