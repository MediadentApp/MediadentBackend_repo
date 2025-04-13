import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import User from '#src/models/userModel.js';
import { IUser } from '#src/types/model.js';
import ApiError from '#src/utils/ApiError.js';

/**
 * Checks if a user with the given email already exists in the database.
 * @throws {ApiError} If user already exists
 * @param {string} email The email address to check
 * @returns {Promise<null | void>} Null if user does not exist, otherwise throws an ApiError
 */
export const checkIfUserExists = async (email: string): Promise<void> => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(responseMessages.USER.USER_NOT_FOUND, 404, ErrorCodes.LOGIN.USER_NOT_FOUND);

  return loginServiceErrorResponse(user);
};

export function loginServiceErrorResponse(user: IUser) {
  if (user.manualSignup) {
    throw new ApiError(
      responseMessages.AUTH.SIGNUP_USER_ALREADY_EXISTS,
      409,
      ErrorCodes.SIGNUP.USER_ALREADY_EXISTS,
      '/login'
    );
  }

  otherLoginServiceErrorResponse(user);
}

export function otherLoginServiceErrorResponse(user: IUser): void {
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
