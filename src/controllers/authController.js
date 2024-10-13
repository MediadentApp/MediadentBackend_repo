const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const TempUser = require('../models/tempUserModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');
const util = require('../utils/util');
const config = require('../config/config');
const { createSendToken } = require('@src/utils/authUtils');
const { UserFormat } = require('@src/models/userFormatModel');

exports.emailReg = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  // Check if a user already exist with that email
  const userExists = await User.findOne({ email });
  if (userExists) {
    if (userExists.manualSignup) {
      return res.status(409).json({
        status: 'fail',
        message: 'User already exists. Please log in using your email and password.',
      });
    } else {
      return res.status(409).json({
        status: 'success',
        message: 'User email is already verified, redirect to signup.',
      });
    }
  }

  // Check if the email exists in TempUser
  const tempUserDb = await TempUser.findOne({ email });

  // check if email is already verified
  if (tempUserDb && tempUserDb?.emailVerified) {
    // 204 No Content: Do not send a body; use .end() instead of .json().
    return res.status(204).end();
  }

  if (tempUserDb && tempUserDb?.otpSendAt) {
    if (await tempUserDb.checkOtpTime()) {
      return next(new AppError(`If you have already sent an OTP, please wait for ${config.otp.sendOtpAfter} minutes before requesting another one.`));
    }
  }
  await TempUser.findOneAndDelete({ email });

  // Generate OTP and set expiration time
  const otp = util.generateOTP();
  const otpSendAt = new Date(Date.now());
  const otpExpiration = new Date(Date.now() + config.otp.otpExpiration * 60 * 1000);

  // Send OTP to user's email
  const emailMessage = `Your OTP for email verification is: ${otp}, The otp will expire in ${config.otp.otpExpiration}`;
  try {
    await sendEmail({
      email,
      subject: 'Email Verification OTP',
      message: emailMessage
    });

    const tempUser = await TempUser.create({
      email,
      otp,
      otpSendAt,
      otpExpiration
    });
    await tempUser.save();

    res.status(200).json({
      status: 'success',
      message: 'OTP sent to your email for verification',
      data: {
        email
      }
    });
  } catch (err) {
    return next(new AppError('There was an error sending the email', 500));
  }
});

exports.emailVerify = catchAsync(async (req, res, next) => {
  const { otp, email } = req.body;

  // Check if a user already exist with that email
  const userExists = await User.findOne({ email });
  if (userExists && userExists?.password) {
    return res.status(409).json({
      status: 'fail',
      message: 'User already exists',
    });
  }

  const tempUser = await TempUser.findOne({ email });
  if (!tempUser) return next(new AppError('Please register your email before proceeding.', 400));
  if (tempUser?.emailVerified) return next(new AppError('Email is already verified', 400));
  if (!tempUser.checkOtp(otp)) return next(new AppError('The OTP provided is incorrect.', 400));
  if (tempUser.checkOtpExpiration()) return next(new AppError('The OTP has expired, please request a new one.', 400));

  tempUser.emailVerified = true;
  await tempUser.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Email is verified, Redirect to Sign-in page',
    data: {
      email
    }
  });
});

exports.signup = catchAsync(async (req, res, next) => {
  const {
    firstName, lastName, email, password, passwordConfirm, passwordChangedAt
  } = req.body;

  const userExist = await User.findOne({ email });
  if (userExist) {
    if (userExist.manualSignup) {
      return next(new AppError('User already Exist, Redirect to Login page', 409));
    } else {
      userExist.manualSignup = true;
      userExist.password = password;
      userExist.passwordConfirm = passwordConfirm;
      userExist.passwordChangedAt = passwordChangedAt;
      await userExist.save({ validateBeforeSave: true });
      return createSendToken(userExist, 201, res);
    }
  }

  const tempUser = await TempUser.findOne({ email });
  if (!tempUser || !tempUser?.emailVerified) return next(new AppError('Please verify your email before registering.', 401));

  const newUser = await User.create({
    firstName: firstName,
    lastName: lastName,
    email: tempUser.email,
    password: password,
    passwordConfirm: passwordConfirm,
    passwordChangedAt: passwordChangedAt,
    manualSignup: true
  });

  // Creating jwt token
  createSendToken(newUser, 201, res);
});

exports.signupDetails = catchAsync(async (req, res, next) => {
  const { userType, gender, institute, currentCity } = req.body;
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  const { _id } = await User.protect(token);

  // const formats = await UserFormat.findOne({}, 'userType userGender');
  // Check for required fields and validate userType and gender
  if (
    // !formats ||
    // !formats.userType.includes(userType) ||
    // !formats.userGender.includes(gender) ||
    !userType ||
    !gender ||
    !institute ||
    !currentCity
  ) {
    return next(new AppError('Validation Fail', 400));
  }

  const additionalInfo = { userType, gender, institute, currentCity };

  const updatedUser = await User.findByIdAndUpdate(_id, { additionalInfo }, { new: true });//? new:true to return updated user.

  const redirectUrl = updatedUser.isAdditionalInfoFilled();
  if (redirectUrl !== false) {
    return res.status(200).json({
      status: 'success',
      message: 'Additional Info is not filled, action required',
      code: 200,
      redirectUrl, // URL to fill the required info
      data: { user: updatedUser },
      authenticated: true
    });
  }

  res.status(200).json({
    status: 'success',
    code: 200,
    data: updatedUser
  });
});

exports.signupInterests = catchAsync(async (req, res, next) => {
  const { interests } = req.body;
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  const { _id } = await User.protect(token);

  if (!Array.isArray(interests)) {
    return next(new AppError('Interests must be an array', 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    _id,
    { interests: interests },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    code: 200,
    data: updatedUser
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) return next(new AppError('Please Provide email and password', 400));

  const user = await User.findOne({ email }).select('+password'); // + indicates that the password select is false(in model) so include password in return

  if (user?.googleAccount) return next(new AppError('Login with Google Account', 401));
  if (user?.githubAccount) return next(new AppError('Login with Github Account', 401));
  if (user?.linkedinAccount) return next(new AppError('Login with Google Account', 401));

  // Checks if user's password is correct
  if (!user || !await user.correctPassword(password, user.password)) return next(new AppError('Incorrect email or password', 403));

  // Creating jwt token
  createSendToken(user, 200, res);
});

exports.fetchUser = catchAsync(async (req, res, next) => {
  // 1) Getting the token and checking if it's there
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token || !req.headers.authorization) {
    return next(new AppError('You are not logged in', 401));
  }

  // 2)Verifying token
  // The jwt.verify uses callback,
  // which is a async func that will run after the verification is done,
  // Instead we promisify ts
  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError('Token Invalid or Expired', 401));
  }

  // 3)Check if the user still exists
  const user = await User.findById(decoded.id).select('-passwordChangedAt').populate('education');
  if (!user) return next(new AppError('The user belonging to this token no longer exists', 401));

  // 4)Check if user changed password after the token was issued
  if (user.changedPasswordAfter(decoded.iat)) return next(new AppError('User recently changed the password! Please log in again', 401));

  // Sending user and Creating jwt token
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  // 1) Extract token from the headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2) Use the schema method to protect the route
  const freshUser = await User.protect(token); // Calls the static method on User model

  // 5)Check if user has filled the additional info to move forward
  const redirectUrl = freshUser.isAdditionalInfoFilled();
  if (redirectUrl !== false) {
    return res.status(206).json({
      status: 'partial',
      message: 'Additional Info is not filled, action required',
      code: 206,
      redirectUrl, // URL to fill the required info
      data: { user: freshUser },
      authenticated: true
    });
  }

  // 3) Grant access to the protected route
  req.user = freshUser;
  next();
});

// A restrict function for roles, it will run after protect middleware
//? eg. .restrict('admin') will only let admin access the route.
// authController.restrict('admin','mod')
// A wrapper func that will return the middleware func
exports.restrict = (...roles) => (req, res, next) => {
  // roles is an array now, rest parameter syntax
  if (!roles.include(req.user.role)) return next(new AppError('You do not have permission to perform this action', 403));
  next();
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  if (!req.body.email) return next(new AppError('Please provide your email address to receive Password reset mail', 400));

  // 1)Get user based on the POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError('There is no user with that email address', 404));
  if (user.googleAccount) return next(new AppError('Your account was registered as a Google account. No need for a password reset.', 400));
  if (user.githubAccount) return next(new AppError('Your account was registered as a GitHub account. No need for a password reset.', 400));

  // 2)Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  //To save encrypted passwordResetToken and ExpirationOfToken in db

  // 3)Send it to user's email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetpassword/${resetToken}`;

  const message = `Click the link below to reset your password:\n${resetURL}\n\nIf you did not request a password reset, please ignore this email.`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset Token (valid for 10 minutes)',
      message
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later!', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  if (!req.body?.password || !req.body?.passwordConfirm) return next(new AppError('Please Provide your new password'));

  // 1) Get user based on the token
  // Hashing the encrypted token back to token
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() } // Mongodb formats and compares automatically
  });

  // 2) If the token is not expired and the user exist, set the new password
  if (!user) return next(new AppError('Token is invalid or Expired', 400));

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save(); // save the above to db

  // 3) Update changedPasswordAt property of the user
  // This will happen automatically in userModel

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // ! Add validation to check if required parameters are there
  const { currentPassword, updatedPassword, updatedPasswordConfirm } = req.body;

  // 1) Get user from the collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!await user.correctPassword(currentPassword, user.password)) return next(new AppError('The Provided Password is incorrect', 401));

  // 3) If so, update the password
  user.password = updatedPassword;
  user.passwordConfirm = updatedPasswordConfirm;
  await user.save();

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
};
