import { ErrorCodes } from '../../config/constants/errorCodes.js';
import responseMessages from '../../config/constants/responseMessages.js';
import User from '../../models/userModel.js';
import ApiError from '../../utils/ApiError.js';
/**
 * Checks if a user with the given email already exists in the database.
 * @throws {ApiError} If user already exists
 * @param {string} email The email address to check
 * @returns {Promise<null | void>} Null if user does not exist, otherwise throws an ApiError
 */
export const checkIfUserExists = async (email) => {
    const user = await User.findOne({ email });
    if (!user)
        throw new ApiError(responseMessages.USER.USER_NOT_FOUND, 404, ErrorCodes.LOGIN.USER_NOT_FOUND);
    return loginServiceErrorResponse(user);
};
export function loginServiceErrorResponse(user) {
    if (user.manualSignup) {
        throw new ApiError(responseMessages.AUTH.SIGNUP_USER_ALREADY_EXISTS, 409, ErrorCodes.SIGNUP.USER_ALREADY_EXISTS, '/login');
    }
    otherLoginServiceErrorResponse(user);
}
export function otherLoginServiceErrorResponse(user) {
    const services = [
        { account: user.googleAccount, errorCode: ErrorCodes.LOGIN.USE_GOOGLE_ACCOUNT },
        { account: user.githubAccount, errorCode: ErrorCodes.LOGIN.USE_GITHUB_ACCOUNT },
        { account: user.linkedinAccount, errorCode: ErrorCodes.LOGIN.USE_LINKEDIN_ACCOUNT },
    ];
    for (const service of services) {
        if (service.account) {
            throw new ApiError(responseMessages.AUTH.LOGIN_OTHER_SERVICE, 409, service.errorCode, '/login');
        }
    }
}
