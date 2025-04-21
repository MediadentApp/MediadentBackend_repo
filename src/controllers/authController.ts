import appConfig from '#src/config/appConfig.js';
import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import TempUser from '#src/models/tempUserModel.js';
import User from '#src/models/userModel.js';
import {
  loginServiceErrorResponse,
  otherLoginServiceErrorResponse,
} from '#src/services/auth/checkUserExists.service.js';
import { sendEmail } from '#src/services/email.js';
import { IUser } from '#src/types/model.js';
import { ResetPasswordParams } from '#src/types/param.auth.js';
import {
  EmailRegBody,
  EmailVerifyBody,
  ForgotPasswordBody,
  LoginBody,
  ResetPasswordBody,
  SignupBody,
  SignupDetailsBody,
  SignupInterestsBody,
  UpdatePasswordBody,
} from '#src/types/request.auth.js';
import { AppResponse, IResponseExtra } from '#src/types/api.response.js';
import ApiError from '#src/utils/ApiError.js';
import ApiResponse from '#src/utils/ApiResponse.js';
import { createSendToken } from '#src/utils/authUtils.js';
import catchAsync from '#src/utils/catchAsync.js';
import { generateOTP } from '#src/utils/index.js';
import crypto from 'crypto';
import { NextFunction } from 'express';
import { AppRequest, AppRequestBody } from '#src/types/api.request.js';
import { IResponseMessage } from '#src/types/api.response.messages.js';

export const emailReg = catchAsync(async (req: AppRequestBody<EmailRegBody>, res: AppResponse, next: NextFunction) => {
  const { email } = req.body;

  if (!email)
    return next(new ApiError(responseMessages.AUTH.INCOMPLETE_INFO, 400, ErrorCodes.SIGNUP.INCOMPLETE_CREDENTIALS));

  // Check if a user already exists with that email

  const user = await User.findOne({ email });
  if (user) {
    loginServiceErrorResponse(user);
  }

  // Fetch TempUser data
  const tempUserDb = await TempUser.findOne({ email }, 'emailVerified otpSendAt');
  if (tempUserDb) {
    if (tempUserDb.emailVerified) {
      return next(
        new ApiError(responseMessages.AUTH.EMAIL_ALREADY_VERIFIED, 200, ErrorCodes.SIGNUP.EMAIL_ALREADY_VERIFIED)
      );
    }
    if (tempUserDb.otpSendAt && (await tempUserDb.checkOtpTime())) {
      return next(new ApiError(responseMessages.AUTH.OTP_ALREADY_SENT, 400, ErrorCodes.SIGNUP.OTP_ALREADY_SENT));
    }
    // Cleanup existing temp user data
    await TempUser.deleteOne({ email });
  }

  // Generate OTP and prepare email
  const otp = generateOTP();

  const emailMessage = `
     Hello,
 
     Your OTP for email verification is: **${otp}**
 
     This OTP is valid for ${appConfig.otp.otpExpiration} minutes.
 
     If you did not request this, please ignore this email.
 
     Regards,
     The Mediadent Team
   `;

  try {
    // Send email and save TempUser concurrently
    await Promise.all([
      sendEmail({
        email,
        subject: 'Email Verification OTP',
        message: emailMessage,
      }),
      TempUser.create({
        email,
        otp,
      }),
    ]);

    return ApiResponse(res, 200, responseMessages.AUTH.OTP_SENT, { email });
  } catch (err: unknown) {
    console.error('Error during email registration:', err);
    return next(new ApiError(responseMessages.GENERAL.CANNOT_SENT_EMAIL, 500));
  }
});

export const emailVerify = catchAsync(
  async (req: AppRequestBody<EmailVerifyBody>, res: AppResponse, next: NextFunction) => {
    const { otp, email } = req.body;

    if (!otp || !email)
      return next(new ApiError(responseMessages.AUTH.INCOMPLETE_INFO, 400, ErrorCodes.SIGNUP.INCOMPLETE_CREDENTIALS));

    // Check if a user already exists with that email
    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new ApiError(responseMessages.USER.ALREADY_EXISTS_EMAIL, 409, ErrorCodes.SIGNUP.USER_ALREADY_EXISTS));
    }

    const tempUser = await TempUser.findOne({ email });
    if (!tempUser)
      return next(new ApiError(responseMessages.AUTH.EMAIL_UNVERIFIED, 400, ErrorCodes.SIGNUP.EMAIL_UNVERIFIED));
    if (tempUser.emailVerified)
      return next(
        new ApiError(responseMessages.AUTH.EMAIL_ALREADY_VERIFIED, 409, ErrorCodes.SIGNUP.EMAIL_ALREADY_VERIFIED)
      );

    if (!tempUser.checkOtp(Number(otp)))
      return next(new ApiError(responseMessages.AUTH.OTP_INCORRECT, 400, ErrorCodes.SIGNUP.OTP_INCORRECT));

    if (tempUser.checkOtpExpiration())
      return next(new ApiError(responseMessages.AUTH.OTP_EXPIRED, 400, ErrorCodes.SIGNUP.OTP_EXPIRED));

    tempUser.emailVerified = true;
    await tempUser.save({ validateBeforeSave: false });

    return ApiResponse(res, 200, responseMessages.AUTH.EMAIL_VERIFIED, { email });
  }
);

export const signup = catchAsync(async (req: AppRequestBody<SignupBody>, res: AppResponse, next: NextFunction) => {
  const { firstName, lastName, email, password, passwordConfirm } = req.body;

  if (!firstName || !lastName || !email || !password || !passwordConfirm)
    return next(new ApiError(responseMessages.AUTH.INCOMPLETE_INFO, 400, ErrorCodes.SIGNUP.INCOMPLETE_CREDENTIALS));

  // Check if a user already exists with that email
  const user = await User.findOne({ email });
  if (user) {
    loginServiceErrorResponse(user);
  }

  // To manual register with email verified by other login service
  // const userExists = await User.findFullUser({ email });
  // if (userExists) {
  //   if (userExists.manualSignup) {
  //     return next(
  //       new ApiError('User already exists, Redirect to Login page', 409, ErrorCodes.SIGNUP.REDIRECT_TO_LOGIN)
  //     );
  //   }
  //   userExists.manualSignup = true;
  //   userExists.password = password;
  //   userExists.passwordConfirm = passwordConfirm;
  //   userExists.passwordChangedAt = passwordChangedAt;
  //   await userExists.save({ validateBeforeSave: true });
  //   return createSendToken(userExists, 201, res);
  // }

  const tempUser = await TempUser.findOne({ email });
  if (!tempUser || !tempUser.emailVerified) {
    return next(new ApiError(responseMessages.AUTH.EMAIL_UNVERIFIED, 401, ErrorCodes.SIGNUP.EMAIL_UNVERIFIED));
  }

  const newUser = await User.create({
    firstName,
    lastName,
    email: tempUser.email,
    password,
    passwordConfirm,
    manualSignup: true,
  });

  let extra: IResponseExtra = { authenticated: true };

  const result = newUser?.isAdditionalInfoFilled();
  if (result && result.redirectUrl) {
    const { redirectUrl, message, errorCode } = result;
    extra = { ...extra, errorCode, redirectUrl, message };
  }

  // Creating JWT token
  createSendToken(newUser, 201, res, extra);
});

// Shouldn't be used with Protect middleware
export const signupDetails = catchAsync(
  async (req: AppRequestBody<SignupDetailsBody>, res: AppResponse, next: NextFunction) => {
    const { userType, gender, institute, currentCity } = req.body;
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    const { _id } = await User.protectApi(token);

    if (!userType || !gender || !institute || !currentCity) {
      return next(
        new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
      );
    }

    const additionalInfo = {
      userType,
      gender,
      institute,
      currentCity,
    };

    const updatedUser = await User.findByIdAndUpdate(_id, { additionalInfo }, { new: true });

    const data = { user: updatedUser! };
    let extra: IResponseExtra = { authenticated: true };

    const result = updatedUser?.isAdditionalInfoFilled();
    if (result && result.redirectUrl) {
      const { redirectUrl, message, errorCode } = result;
      extra = { ...extra, errorCode, redirectUrl };
      return ApiResponse(res, 200, message, data, extra);
    }

    return ApiResponse(res, 200, responseMessages.AUTH.SUCCESS, data, extra);
  }
);

// Shouldn't be used with Protect middleware
export const signupInterests = catchAsync(
  async (req: AppRequestBody<SignupInterestsBody>, res: AppResponse, next: NextFunction) => {
    const { interests } = req.body;
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    const { _id } = await User.protectApi(token);

    if (interests.length < appConfig.app.numOfSignupInterests) {
      return next(new ApiError(responseMessages.DATA.INTERESTS_LENGTH, 406, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }

    // Updated User with the interests
    const updatedUser = await User.findByIdAndUpdate(_id, { interests }, { new: true, runValidators: true });

    const data = { user: updatedUser! };
    let extra: IResponseExtra = { authenticated: true };

    // Now check for other details are filled
    const result = updatedUser?.isAdditionalInfoFilled();
    if (result && result.redirectUrl) {
      const { redirectUrl, message, errorCode } = result;
      extra = { ...extra, errorCode, redirectUrl };
      return ApiResponse(res, 200, message, data, extra);
    }

    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data, extra);
  }
);

export const login = catchAsync(async (req: AppRequestBody<LoginBody>, res: AppResponse, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(
      new ApiError(responseMessages.AUTH.INCOMPLETE_CREDENTIALS, 400, ErrorCodes.LOGIN.INCOMPLETE_CREDENTIALS)
    );
  }

  const user = await User.findFullUser({ email }, '+password');

  if (!user || !user.password)
    return next(new ApiError(responseMessages.AUTH.INCORRECT_CREDENTIALS, 401, ErrorCodes.LOGIN.INVALID_CREDENTIALS));

  otherLoginServiceErrorResponse(user);

  const isPasswordCorrect = await user.correctPassword(password, user.password);
  if (!isPasswordCorrect)
    return next(new ApiError(responseMessages.AUTH.INCORRECT_CREDENTIALS, 401, ErrorCodes.LOGIN.INVALID_CREDENTIALS));

  let extra: IResponseExtra = { authenticated: true };

  const result = user?.isAdditionalInfoFilled();
  if (result && result.redirectUrl) {
    const { redirectUrl, message, errorCode } = result;
    extra = { ...extra, errorCode, redirectUrl, message };
  }

  // Creating JWT token
  return createSendToken(user, 200, res, extra);
});

export const fetchUser = catchAsync(async (req: AppRequest, res: AppResponse, next: NextFunction) => {
  // From protect middleware
  const { user } = req;

  if (!user || !(user instanceof User)) {
    return next(new ApiError(responseMessages.USER.USER_NOT_FOUND, 404, ErrorCodes.LOGIN.USER_NOT_FOUND));
  }
  // Sending user and creating JWT token
  createSendToken(user, 200, res);
});

export const protect = catchAsync(async (req: AppRequest, res: AppResponse, next: NextFunction) => {
  let token: string | undefined;

  // 1) Extract token from the headers
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(responseMessages.AUTH.UNAUTHENTICATED, 401, ErrorCodes.LOGIN.REDIRECT, '/login'));
  }

  // 2) Use the schema method to protect the route
  const freshUser = await User.protectApi(token); // Calls the static method on User model

  // 3) Check if user has filled additional info
  const result = freshUser?.isAdditionalInfoFilled();
  if (result && result.redirectUrl) {
    const { redirectUrl, message, errorCode } = result;
    const data = {
      user: freshUser,
    };
    const extra = { authenticated: true, errorCode, redirectUrl };

    return ApiResponse(res, 206, message, data, extra);
  }

  // 4) Grant access to the protected route
  req.user = freshUser;
  next();
});

// A restrict function for roles, it will run after protect middleware
export const restrict =
  (...roles: string[]) =>
  (req: AppRequest, res: AppResponse, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(responseMessages.AUTH.UNAUTHENTICATED, 403, ErrorCodes.CLIENT.UNAUTHORIZED));
    }
    next();
  };

export const forgotPassword = catchAsync(
  async (req: AppRequestBody<ForgotPasswordBody>, res: AppResponse, next: NextFunction) => {
    const { email } = req.body;

    // Validate email input
    if (!email) {
      return next(
        new ApiError(
          responseMessages.CLIENT.MISSING_INVALID_INPUT,
          400,
          ErrorCodes.PASSWORD_RESET.INCOMPLETE_CREDENTIALS
        )
      );
    }

    // 1) Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return next(new ApiError(responseMessages.USER.USER_NOT_FOUND, 404, ErrorCodes.PASSWORD_RESET.USER_NOT_FOUND));
    }
    if (user.googleAccount) {
      // Your account is registered with Google. No password reset is needed.
      return next(
        new ApiError(responseMessages.GENERAL.METHOD_NOT_ALLOWED, 400, ErrorCodes.GENERAL.METHOD_NOT_ALLOWED)
      );
    }
    if (user.githubAccount) {
      // 'Your account is registered with GitHub. No password reset is needed.',
      return next(
        new ApiError(responseMessages.GENERAL.METHOD_NOT_ALLOWED, 400, ErrorCodes.GENERAL.METHOD_NOT_ALLOWED)
      );
    }

    // 2) Generate reset token and save it to the user document
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false }); // Disable validators to prevent unnecessary checks

    // 3) Construct password reset URL
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const resetURL = `${baseUrl}/api/v1/users/resetpassword/${resetToken}`;

    // Email message (plain text and HTML)
    const message = `
    Hello,

    Click the link below to reset your password:
    ${resetURL}

    This link is valid for 10 minutes.

    If you did not request a password reset, please ignore this email.

    Regards,
    The Mediadent Team
  `;
    const htmlMessage = `
    <p>Hello,</p>
    <p>Click the link below to reset your password:</p>
    <a href="${resetURL}" target="_blank">${resetURL}</a>
    <p>This link is valid for 10 minutes.</p>
    <p>If you did not request a password reset, please ignore this email.</p>
    <br />
    <p>Regards,</p>
    <p>The Mediadent Team</p>
  `;

    // 4) Send email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Your Password Reset Token (valid for 10 minutes)',
        message,
        html: htmlMessage,
      });

      return ApiResponse(res, 200, responseMessages.AUTH.PASSWORD_RESET_SENT, { email });
    } catch (err: unknown) {
      // Reset token fields if email sending fails
      const userUpdates: Partial<IUser> = {
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
      };
      Object.assign(user, userUpdates);
      await user.save({ validateBeforeSave: false }); // Ensure consistency in DB

      console.error('Error sending password reset email:', err);
      return next(new ApiError(responseMessages.AUTH.PASSWORD_RESET_SENT_ERROR, 500));
    }
  }
);

export const resetPassword = catchAsync(
  async (req: AppRequest<ResetPasswordParams, ResetPasswordBody>, res: AppResponse, next: NextFunction) => {
    const { password, passwordConfirm } = req.body;
    const { token } = req.params;

    if (!token) {
      return next(new ApiError(responseMessages.AUTH.INVALID_TOKEN, 400, ErrorCodes.PASSWORD_RESET.TOKEN_INVALID));
    }

    if (!password || !passwordConfirm) {
      return next(
        new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.PASSWORD_RESET.PROVIDE_NEW_PASSWORD)
      );
    }

    // 1) Get user based on the token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }, // MongoDB compares timestamps automatically
    });

    // 2) If the token is expired or the user doesn't exist, return an error
    if (!user) {
      return next(new ApiError(responseMessages.AUTH.INVALID_TOKEN, 400, ErrorCodes.PASSWORD_RESET.TOKEN_EXPIRED));
    }

    user.password = password;
    user.passwordConfirm = passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save(); // Save the changes to the DB

    // 3) Log the user in, send JWT
    createSendToken(user, 200, res);
  }
);

export const updatePassword = catchAsync(
  async (req: AppRequestBody<UpdatePasswordBody>, res: AppResponse, next: NextFunction) => {
    const { currentPassword, updatedPassword, updatedPasswordConfirm } = req.body;

    if (!currentPassword || !updatedPassword || !updatedPasswordConfirm) {
      return next(
        new ApiError(
          responseMessages.AUTH.INCORRECT_CREDENTIALS,
          400,
          ErrorCodes.PASSWORD_UPDATE.INCOMPLETE_CREDENTIALS
        )
      );
    }

    // 1) Get user from the collection
    const user = await User.findById(req.user?.id).select('+password');
    if (!user || !user?.password) {
      return next(new ApiError(responseMessages.USER.USER_NOT_FOUND, 404, ErrorCodes.PASSWORD_UPDATE.USER_NOT_FOUND));
    }

    // 2) Check if POSTed current password is correct
    const isPasswordCorrect = await user.correctPassword(currentPassword, user.password);
    if (!isPasswordCorrect) {
      return next(
        new ApiError(responseMessages.AUTH.INCORRECT_PASSWORD, 401, ErrorCodes.PASSWORD_UPDATE.INCORRECT_PASSWORD)
      );
    }

    // 3) Update the password
    user.password = updatedPassword;
    user.passwordConfirm = updatedPasswordConfirm;
    await user.save();

    // 4) Log the user in, send JWT
    createSendToken(user, 200, res);
  }
);

// export const logout = (req: AppRequest, res: AppResponse, next: NextFunction) => {
//   req.logout((err) => {
//     if (err) {
//       return next(err);
//     }
//     res.redirect('/');
//   });
// };
