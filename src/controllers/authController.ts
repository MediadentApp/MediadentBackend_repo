import appConfig from '#src/config/appConfig.js';
import { ErrorCodes } from '#src/config/errorCodes.js';
import TempUser from '#src/models/tempUserModel.js';
import User from '#src/models/userModel.js';
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
import ApiError from '#src/utils/appError.js';
import { createSendToken } from '#src/utils/authUtils.js';
import catchAsync from '#src/utils/catchAsync.js';
import { generateOTP } from '#src/utils/index.js';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const emailReg = catchAsync(async (req: Request<{}, {}, EmailRegBody>, res: Response, next: NextFunction) => {
  const { email } = req.body;

  if (!email) next(new ApiError('Please provide email', 400, ErrorCodes.SIGNUP.INCOMPLETE_CREDENTIALS));

  // Check if a user already exists with that email
  const userExists = await User.findOne({ email });
  if (userExists) {
    if (userExists.manualSignup) {
      return next(
        new ApiError(
          'User already exists. Please log in using your email and password.',
          409,
          ErrorCodes.SIGNUP.USER_ALREADY_EXISTS,
          '/login'
        )
      );
    }
    console.log('user email already valid');
    return next(new ApiError(`User email is already verified.`, 409, ErrorCodes.SIGNUP.EMAIL_ALREADY_VERIFIED));
  }

  // Fetch TempUser data
  const tempUserDb = await TempUser.findOne({ email }, 'emailVerified otpSendAt');
  if (tempUserDb) {
    if (tempUserDb.emailVerified) {
      return res.status(204).end(); // No Content
    }
    if (tempUserDb.otpSendAt && (await tempUserDb.checkOtpTime())) {
      return next(
        new ApiError(
          `Please wait ${appConfig.otp.sendOtpAfter} minutes before requesting a new OTP if one has already been sent.`,
          400,
          ErrorCodes.SIGNUP.OTP_ALREADY_SENT
        )
      );
    }
    // Cleanup existing temp user data
    await TempUser.deleteOne({ email });
  }

  // Generate OTP and prepare email
  const otp = generateOTP();
  const otpSendAt = new Date();
  const otpExpiration = new Date(Date.now() + appConfig.otp.otpExpiration * 60 * 1000);

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
        otpSendAt,
        otpExpiration,
      }),
    ]);

    res.status(200).json({
      status: 'success',
      message: 'OTP sent to your email for verification',
      data: { email },
    });
  } catch (err: unknown) {
    console.error('Error during email registration:', err);
    return next(new ApiError('There was an error sending the email', 500));
  }
});

export const emailVerify = catchAsync(
  async (req: Request<{}, {}, EmailVerifyBody>, res: Response, next: NextFunction) => {
    const { otp, email } = req.body;

    // Check if a user already exists with that email
    const userExists = await User.findOne({ email });
    if (userExists && userExists.password) {
      return res.status(409).json({
        status: 'fail',
        message: 'User already exists',
      });
    }

    const tempUser = await TempUser.findOne({ email });
    if (!tempUser)
      return next(
        new ApiError('Please register your email before proceeding.', 400, ErrorCodes.SIGNUP.EMAIL_UNVERIFIED)
      );
    if (tempUser.emailVerified)
      return next(new ApiError('Email is already verified', 409, ErrorCodes.SIGNUP.EMAIL_ALREADY_VERIFIED));

    if (!tempUser.checkOtp(Number(otp)))
      return next(new ApiError('The OTP provided is incorrect.', 400, ErrorCodes.SIGNUP.OTP_INCORRECT));

    if (tempUser.checkOtpExpiration())
      return next(new ApiError('The OTP has expired, please request a new one.', 400, ErrorCodes.SIGNUP.OTP_EXPIRED));

    tempUser.emailVerified = true;
    await tempUser.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: 'Email is verified, Redirect to Sign-in page',
      data: { email },
    });
  }
);

export const signup = catchAsync(async (req: Request<{}, {}, SignupBody>, res: Response, next: NextFunction) => {
  const { firstName, lastName, email, password, passwordConfirm, passwordChangedAt } = req.body;

  const userExists = await User.findFullUser({ email });
  if (userExists) {
    if (userExists.manualSignup) {
      return next(
        new ApiError('User already exists, Redirect to Login page', 409, ErrorCodes.SIGNUP.REDIRECT_TO_LOGIN)
      );
    }
    userExists.manualSignup = true;
    userExists.password = password;
    userExists.passwordConfirm = passwordConfirm;
    userExists.passwordChangedAt = passwordChangedAt;
    await userExists.save({ validateBeforeSave: true });
    return createSendToken(userExists, 201, res);
  }

  const tempUser = await TempUser.findOne({ email });
  if (!tempUser || !tempUser.emailVerified) {
    return next(new ApiError('Please verify your email before registering.', 401, ErrorCodes.SIGNUP.EMAIL_UNVERIFIED));
  }

  const newUser = await User.create({
    firstName,
    lastName,
    email: tempUser.email,
    password,
    passwordConfirm,
    passwordChangedAt,
    manualSignup: true,
  });

  const redirectUrl = newUser.isAdditionalInfoFilled();

  // Creating JWT token
  createSendToken(newUser, 201, res, redirectUrl ? { redirectUrl } : {});
});

export const signupDetails = catchAsync(
  async (req: Request<{}, {}, SignupDetailsBody>, res: Response, next: NextFunction) => {
    const { userType, gender, institute, currentCity } = req.body;

    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return next(new ApiError('Unauthorized: No token provided', 401, ErrorCodes.SIGNUP.REDIRECT_TO_LOGIN));

    const { _id } = await User.protectApi(token);
    if (!_id) return next(new ApiError('Unauthorized: Invalid token', 401, ErrorCodes.SIGNUP.REDIRECT_TO_LOGIN));

    if (!userType || !gender || !institute || !currentCity) {
      return next(new ApiError('Validation Fail', 400));
    }

    const additionalInfo = {
      userType,
      gender,
      institute,
      currentCity,
    };

    const updatedUser = await User.findByIdAndUpdate(_id, { additionalInfo }, { new: true });

    const redirectUrl = updatedUser?.isAdditionalInfoFilled();
    if (redirectUrl) {
      return res.status(200).json({
        status: 'success',
        message: 'Additional Info is not filled, action required',
        code: 200,
        redirectUrl,
        data: { user: updatedUser },
        authenticated: true,
      });
    }

    res.status(200).json({
      status: 'success',
      code: 200,
      data: updatedUser,
    });
  }
);

export const signupInterests = catchAsync(
  async (req: Request<{}, {}, SignupInterestsBody>, res: Response, next: NextFunction) => {
    const { interests } = req.body;
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return next(new ApiError('Unauthorized: No token provided', 401, ErrorCodes.SIGNUP.REDIRECT_TO_LOGIN));

    const { _id } = await User.protectApi(token);
    if (!_id) return next(new ApiError('Unauthorized: Invalid token', 401, ErrorCodes.SIGNUP.REDIRECT_TO_LOGIN));

    if (!Array.isArray(interests)) {
      return next(new ApiError('Interests must be an array', 400));
    }

    if (interests.length < appConfig.app.numOfSignupInterests) {
      return next(new ApiError(`Choose at least ${appConfig.app.numOfSignupInterests} interests`, 406));
    }

    const updatedUser = await User.findByIdAndUpdate(_id, { interests }, { new: true, runValidators: true });

    res.status(200).json({
      status: 'success',
      code: 200,
      data: updatedUser,
    });
  }
);

export const login = catchAsync(async (req: Request<{}, {}, LoginBody>, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ApiError('Please provide email and password', 400, ErrorCodes.LOGIN.INCOMPLETE_CREDENTIALS));
  }

  const user = await User.findFullUser({ email }, '+password');

  if (!user || !user.password)
    return next(new ApiError('User is not registered.', 403, ErrorCodes.LOGIN.USER_NOT_FOUND, '/login'));

  if (user.googleAccount)
    return next(new ApiError('Login with Google Account', 401, ErrorCodes.LOGIN.USE_GOOGLE_ACCOUNT));

  if (user.githubAccount)
    return next(new ApiError('Login with GitHub Account', 401, ErrorCodes.LOGIN.USE_GITHUB_ACCOUNT));

  if (user.linkedinAccount)
    return next(new ApiError('Login with LinkedIn Account', 401, ErrorCodes.LOGIN.USE_LINKEDIN_ACCOUNT));

  const isPasswordCorrect = await user.correctPassword(password, user.password);
  if (!isPasswordCorrect)
    return next(new ApiError('Incorrect email or password', 403, ErrorCodes.LOGIN.INVALID_CREDENTIALS));

  const redirectUrl = user.isAdditionalInfoFilled();

  // Creating JWT token
  createSendToken(user, 201, res, { ...(redirectUrl && { redirectUrl }) });
});

export const fetchUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // From protect middleware
  const { user } = req.body;

  if (!user || !(user instanceof User)) {
    return next(new ApiError('User not found', 404, ErrorCodes.LOGIN.USER_NOT_FOUND));
  }
  // Sending user and creating JWT token
  createSendToken(user, 200, res);
});

export const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // 1) Extract token from the headers
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new ApiError(
        'You are not logged in. Please log in to access this route.',
        401,
        ErrorCodes.LOGIN.REDIRECT,
        '/login'
      )
    );
  }

  // 2) Use the schema method to protect the route
  const freshUser = await User.protectApi(token); // Calls the static method on User model

  // 3) Check if user has filled additional info
  const redirectUrl = freshUser.isAdditionalInfoFilled();
  if (redirectUrl) {
    return res.status(206).json({
      status: 'partial',
      message: 'Additional Info is not filled, action required',
      code: 206,
      redirectUrl,
      data: { user: freshUser },
      authenticated: true,
    });
  }

  // 4) Grant access to the protected route
  req.user = freshUser;
  next();
});

// A restrict function for roles, it will run after protect middleware
export const restrict =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ApiError('You do not have permission to perform this action', 403, ErrorCodes.LOGIN.UNAUTHORIZED)
      );
    }
    next();
  };

export const forgotPassword = catchAsync(
  async (req: Request<{}, {}, ForgotPasswordBody>, res: Response, next: NextFunction) => {
    const { email } = req.body;

    // Validate email input
    if (!email) {
      return next(
        new ApiError(
          'Please provide your email address to receive the password reset email.',
          400,
          ErrorCodes.PASSWORD_RESET.INCOMPLETE_CREDENTIALS
        )
      );
    }

    // 1) Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return next(
        new ApiError('There is no user with that email address.', 404, ErrorCodes.PASSWORD_RESET.USER_NOT_FOUND)
      );
    }
    if (user.googleAccount) {
      return next(
        new ApiError(
          'Your account is registered with Google. No password reset is needed.',
          400,
          ErrorCodes.PASSWORD_RESET.USE_GOOGLE_ACCOUNT
        )
      );
    }
    if (user.githubAccount) {
      return next(
        new ApiError(
          'Your account is registered with GitHub. No password reset is needed.',
          400,
          ErrorCodes.PASSWORD_RESET.USE_GITHUB_ACCOUNT
        )
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

      res.status(200).json({
        status: 'success',
        message: 'Password reset token sent to email.',
      });
    } catch (err: unknown) {
      // Reset token fields if email sending fails
      const userUpdates: Partial<IUser> = {
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
      };
      Object.assign(user, userUpdates);
      await user.save({ validateBeforeSave: false }); // Ensure consistency in DB

      console.error('Error sending password reset email:', err);
      return next(new ApiError('There was an error sending the email. Please try again later.', 500));
    }
  }
);

export const resetPassword = catchAsync(
  async (req: Request<ResetPasswordParams, {}, ResetPasswordBody>, res: Response, next: NextFunction) => {
    const { password, passwordConfirm } = req.body;
    const { token } = req.params;

    if (!token) {
      return next(new ApiError('Client error: invalid token provided', 400, ErrorCodes.PASSWORD_RESET.TOKEN_INVALID));
    }

    if (!password || !passwordConfirm) {
      return next(
        new ApiError('Please provide your new password.', 400, ErrorCodes.PASSWORD_RESET.PROVIDE_NEW_PASSWORD)
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
      return next(new ApiError('Token is invalid or expired.', 400, ErrorCodes.PASSWORD_RESET.TOKEN_EXPIRED));
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
  async (req: Request<{}, {}, UpdatePasswordBody>, res: Response, next: NextFunction) => {
    const { currentPassword, updatedPassword, updatedPasswordConfirm } = req.body;

    if (!currentPassword || !updatedPassword || !updatedPasswordConfirm) {
      return next(
        new ApiError(
          'Please provide all required password fields.',
          400,
          ErrorCodes.PASSWORD_UPDATE.INCOMPLETE_CREDENTIALS
        )
      );
    }

    // 1) Get user from the collection
    const user = await User.findById(req.user?.id).select('+password');
    if (!user || !user?.password) {
      return next(new ApiError('User not found.', 404, ErrorCodes.PASSWORD_UPDATE.USER_NOT_FOUND));
    }

    // 2) Check if POSTed current password is correct
    const isPasswordCorrect = await user.correctPassword(currentPassword, user.password);
    if (!isPasswordCorrect) {
      return next(
        new ApiError('The provided password is incorrect.', 401, ErrorCodes.PASSWORD_UPDATE.INCORRECT_PASSWORD)
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

// export const logout = (req: Request, res: Response, next: NextFunction) => {
//   req.logout((err) => {
//     if (err) {
//       return next(err);
//     }
//     res.redirect('/');
//   });
// };
