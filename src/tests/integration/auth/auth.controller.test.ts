import { app } from '#src/app.js';
import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import TempUser from '#src/models/tempUserModel.js';
import request from 'supertest';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import * as emailService from '#src/services/email.js';
import User from '#src/models/userModel.js';
import { generateUniqueUser, generateUserDetails } from '#src/tests/seeds.js';
import { authRequest } from '#src/tests/utils.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import appConfig from '#src/config/appConfig.js';

// Mock sendEmail function
vi.spyOn(emailService, 'sendEmail').mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Authentication Tests:', () => {
  describe('Email Registration', () => {
    describe('✅ Success Cases', () => {
      it('should send an OTP when a valid email is provided', async () => {
        const email = 'sendotp@example.com';
        const res = await request(app).post('/api/v1/auth/emailReg').send({
          email,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.message).toBeDefined();
        expect(res.body.data).toHaveProperty('email');
        const tempUser = await TempUser.findOne({ email });
        expect(tempUser).not.toBeNull();
        expect(tempUser?.otp).toBeDefined();
        expect(tempUser?.otpSendAt).toBeDefined();
        expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
        expect(emailService.sendEmail).toHaveBeenCalledWith({
          email,
          subject: 'Email Verification OTP',
          message: expect.stringContaining('Your OTP for email verification'),
        });
      });

      it('should allow sending/rejecting/resending OTP after 2 minutes', async () => {
        const email = 'resendotp@example.com';

        // First OTP request
        const firstRes = await request(app).post('/api/v1/auth/emailReg').send({ email });
        expect(firstRes.statusCode).toBe(200);
        expect(firstRes.body.status).toBe('success');

        // Immediately send another OTP request (should fail)
        const secondRes = await request(app).post('/api/v1/auth/emailReg').send({ email });
        expect(secondRes.statusCode).toBe(400);
        expect(secondRes.body.errorCode).toBe(ErrorCodes.SIGNUP.OTP_ALREADY_SENT);

        // Change OTP send time to 2 minutes ago
        await TempUser.findOneAndUpdate(
          { email },
          { otpSendAt: new Date(Date.now() - 2 * 60 * 1000) },
          { new: true } // Ensures the latest document is returned
        );

        // Now, resend OTP should succeed
        const thirdRes = await request(app).post('/api/v1/auth/emailReg').send({ email });

        expect(thirdRes.statusCode).toBe(200);
        expect(thirdRes.body.status).toBe('success');
      });

      it('should return 200 if email is already verified', async () => {
        const email = 'verifiedtempuser@example.com';
        // Insert a user in User before testing
        await TempUser.create({ email, emailVerified: true });

        const res = await request(app).post('/api/v1/auth/emailReg').send({
          email,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.message).toBe(responseMessages.AUTH.EMAIL_ALREADY_VERIFIED);
        expect(res.body.errorCode).toBe(ErrorCodes.SIGNUP.EMAIL_ALREADY_VERIFIED);
      });
    });

    describe('❌ Failure Cases', () => {
      it('should return 400 if no email is provided', async () => {
        const res = await request(app).post('/api/v1/auth/emailReg').send({});

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe(ErrorCodes.SIGNUP.INCOMPLETE_CREDENTIALS);
        expect(res.body.message).toBe(responseMessages.AUTH.INCOMPLETE_INFO);
      });

      it('should return 400 if an invalid email format is provided', async () => {
        const res = await request(app).post('/api/v1/auth/emailReg').send({
          email: 'invalid-email',
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.status).toBe('fail');
        expect(res.body.errorCode).toBe(ErrorCodes.CLIENT.INVALID_EMAIL);
      });

      it('should return 409 if the user already exists', async () => {
        const res = await request(app).post('/api/v1/auth/emailReg').send({
          email: 'v3p51435@gmail.com',
        });

        expect(res.statusCode).toBe(409);
        expect(res.body.status).toBe('fail');
        expect(res.body.message).toBeDefined();
        expect(res.body.redirectUrl).toBeDefined();
        expect(res.body.errorCode).toBe(ErrorCodes.SIGNUP.USER_ALREADY_EXISTS);
      });

      it('should return 409 if the user has already signed up using a GitHub/Google account', async () => {
        await User.insertMany([
          {
            ...generateUniqueUser('githubSigned'),
            manualSignup: false,
            github_url: 'https://github.com',
            githubAccount: true,
          },
          {
            ...generateUniqueUser('googleSigned'),
            manualSignup: false,
            googleAccount: true,
          },
        ]);

        const githubRes = await request(app).post('/api/v1/auth/emailReg').send({
          email: 'githubSigned@test.com',
        });
        expect(githubRes.statusCode).toBe(409);
        expect(githubRes.body.status).toBe('fail');
        expect(githubRes.body.message).toBeDefined();
        expect(githubRes.body.redirectUrl).toBeDefined();
        expect(githubRes.body.errorCode).toBe(ErrorCodes.LOGIN.USE_GITHUB_ACCOUNT);

        const googleRes = await request(app).post('/api/v1/auth/emailReg').send({
          email: 'googleSigned@test.com',
        });
        expect(googleRes.statusCode).toBe(409);
        expect(googleRes.body.status).toBe('fail');
        expect(googleRes.body.message).toBeDefined();
        expect(googleRes.body.redirectUrl).toBeDefined();
        expect(googleRes.body.errorCode).toBe(ErrorCodes.LOGIN.USE_GOOGLE_ACCOUNT);
      });
    });
  });

  describe('Email Verification', () => {
    describe('✅ Success Cases', () => {
      it('should verify email successfully', async () => {
        const email = 'emailVerifySuccessOtp@example.com';

        const setOtpRes = await request(app).post('/api/v1/auth/emailReg').send({
          email,
        });
        expect(setOtpRes.statusCode).toBe(200);

        // Fetch OTP from DB
        const tempUser = await TempUser.findOne({ email });
        expect(tempUser).not.toBeNull();
        const otp = tempUser?.otp;
        expect(otp).toBeDefined();

        // Send OTP for verification
        const res = await request(app).post('/api/v1/auth/emailVerify').send({
          email,
          otp,
        });

        // Validate response
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.message).toBeDefined();
        expect(res.body.data.email).toBe(email.toLocaleLowerCase());

        // Ensure email is marked as verified
        const updatedUser = await TempUser.findOne({ email });
        expect(updatedUser?.emailVerified).toBe(true);
      });
    });

    describe('❌ Failure Cases', () => {
      it('should return 400 if no email and/or otp is provided', async () => {
        const res = await request(app).post('/api/v1/auth/emailVerify').send({ otp: '123456' });

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe(ErrorCodes.SIGNUP.INCOMPLETE_CREDENTIALS);
        expect(res.body.message).toBeDefined();
      });

      it('should return 409 if user already exists', async () => {
        const email = 'emailVerifyUserExists@manual.com';
        await User.create({
          ...generateUniqueUser('emailVerifyUserExists'),
          email,
        });
        const res = await request(app).post('/api/v1/auth/emailVerify').send({ otp: '123456', email });

        expect(res.statusCode).toBe(409);
        expect(res.body.errorCode).toBe(ErrorCodes.SIGNUP.USER_ALREADY_EXISTS);
        expect(res.body.message).toBeDefined();
      });

      it('should return 400 for incorrect OTP', async () => {
        const email = 'wrongotp@example.com';

        // Create a user with a specific OTP
        await TempUser.create({ email, otp: 123456 });

        const res = await request(app).post('/api/v1/auth/emailVerify').send({ email, otp: '654321' });

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe(ErrorCodes.SIGNUP.OTP_INCORRECT);
        expect(res.body.message).toBe(responseMessages.AUTH.OTP_INCORRECT);
      });

      it('should return 400 if OTP is expired', async () => {
        const email = 'emailVerifyExpiredOtp@example.com';

        // Create a tempUser with an expired OTP
        const setOtpRes = await request(app).post('/api/v1/auth/emailReg').send({
          email,
        });
        expect(setOtpRes.statusCode).toBe(200);

        // Update the tempUser exipiration
        const updatedTempUser = await TempUser.findOneAndUpdate(
          { email },
          { otpSendAt: new Date(Date.now() - 60 * 60 * 1000), otpExpiration: new Date(Date.now() - 50 * 60 * 1000) },
          { new: true }
        );

        const res = await request(app).post('/api/v1/auth/emailVerify').send({ email, otp: updatedTempUser?.otp });

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe(ErrorCodes.SIGNUP.OTP_EXPIRED);
        expect(res.body.message).toBe(responseMessages.AUTH.OTP_EXPIRED);
      });
    });
  });

  describe('User Signup', () => {
    describe('✅ Success Cases', () => {
      it('should send auth token on signup with no Add info', async () => {
        const email = 'SignupSuccessNointerest@example.com';

        await TempUser.create({ email, emailVerified: true });

        const res = await request(app)
          .post('/api/v1/auth/signup')
          .send({
            ...generateUniqueUser('signupSuccess'),
            email,
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.token).toBeDefined();
        expect(res.body.redirectUrl).toBe('/userdetails');
        expect(res.body.data.user).toBeTypeOf('object');

        const user = await User.findOne({ email });
        expect(user).not.toBeNull();
        expect(user?.manualSignup).toBe(true);
      });
    });

    describe('❌ Failure Cases', () => {
      it('should return 400 if incomplete credentials provided', async () => {
        const res = await request(app).post('/api/v1/auth/signup').send({
          firstName: 'First',
          lastName: 'Last',
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe(ErrorCodes.SIGNUP.INCOMPLETE_CREDENTIALS);
      });

      it('should return 409 if the user already exists', async () => {
        const res = await request(app)
          .post('/api/v1/auth/signup')
          .send({
            ...generateUniqueUser('vinTest'),
            email: 'v3p51435@gmail.com',
          });

        expect(res.statusCode).toBe(409);
        expect(res.body.errorCode).toBe(ErrorCodes.SIGNUP.USER_ALREADY_EXISTS);
      });

      it("should return 401 if the user's email is not verified", async () => {
        const email = 'random@gmail.com';

        const emailNoExists = await request(app)
          .post('/api/v1/auth/signup')
          .send({
            ...generateUniqueUser('emailNoExists'),
            email,
          });
        expect(emailNoExists.statusCode).toBe(401);
        expect(emailNoExists.body.errorCode).toBe(ErrorCodes.SIGNUP.EMAIL_UNVERIFIED);

        const resOtpSendUnverifedEmail = await request(app).post('/api/v1/auth/emailReg').send({
          email,
        });
        expect(resOtpSendUnverifedEmail.statusCode).toBe(200);
        expect(resOtpSendUnverifedEmail.body.status).toBe('success');

        const noTempUserRes = await request(app)
          .post('/api/v1/auth/signup')
          .send({
            ...generateUniqueUser('noTempUser'),
            email,
          });
        expect(noTempUserRes.statusCode).toBe(401);
        expect(noTempUserRes.body.errorCode).toBe(ErrorCodes.SIGNUP.EMAIL_UNVERIFIED);
        expect(noTempUserRes.body.message).toBeDefined();
      });
    });
  });

  describe.sequential('User Signup Additional Info', () => {
    let token: string | null = null;
    let email: string | null = null;
    beforeAll(async () => {
      email = 'SignupSuccessforDetails@example.com';
      await TempUser.create({ email, emailVerified: true });

      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          ...generateUniqueUser('SignupSuccessforDetails'),
          email,
        });

      expect(res.statusCode).toBe(201);
      token = res.body.token;
    });
    describe.sequential('More Details', () => {
      describe.sequential('✅ Success Cases', () => {
        it('should return 200 & redirectUrl, if additional info is provided with interests missing', async () => {
          const { put } = authRequest(token!);

          const res = await put('/api/v1/auth/signupdetails').send(generateUserDetails());
          expect(res.statusCode).toBe(200);
          expect(res.body.status).toBe('success');
          expect(res.body.message).toBe(responseMessages.AUTH.REDIRECT_TO_INTERESTS);
          expect(res.body.redirectUrl).toBe(appConfig.urls.signupInterestUrl);
          expect(res.body.authenticated).toBe(true);
          expect(res.body.data.user).toBeDefined();
          expect(res.body.data.user).toBeTypeOf('object');
          email = res.body.data.user.email;

          const user = await User.findOne({ email });
          expect(user).not.toBeNull();
          expect(user?.additionalInfo).toBeDefined();
        });

        it('should return 200, if all details are provided', async () => {
          const { put } = authRequest(token!);

          await User.findOneAndUpdate({ email }, { interests: ['filled'] });

          const res = await put('/api/v1/auth/signupdetails').send(generateUserDetails());
          expect(res.statusCode).toBe(200);
          expect(res.body.redirectUrl).toBeUndefined;
          expect(res.body.authenticated).toBe(true);
          expect(res.body.data.user).toBeDefined();
          expect(res.body.data.user).toBeTypeOf('object');

          const user = await User.findOne({ email });
          expect(user).not.toBeNull();
          expect(user?.additionalInfo).toBeDefined();
          expect(user?.interests).toBeDefined();
          expect(user?.interests).toHaveLength(1);

          await User.findOneAndUpdate({ email }, { interests: [] });
        });
      });
      describe.sequential('❌ Failure Cases', () => {
        it('should return 401, if auth token is not provided', async () => {
          const withNoAdditionalInfoRes = await request(app).put('/api/v1/auth/signupdetails').send({});
          expect(withNoAdditionalInfoRes.statusCode).toBe(401);
          expect(withNoAdditionalInfoRes.body.errorCode).toBe(ErrorCodes.SIGNUP.REDIRECT_TO_LOGIN);
          expect(withNoAdditionalInfoRes.body.message).toBe(responseMessages.AUTH.NO_TOKEN);
        });

        it('should return 401, if invalid auth token', async () => {
          const invalidToken = 'DED';
          const { put } = authRequest(invalidToken);

          const res = await put('/api/v1/auth/signupdetails').send(generateUserDetails());
          expect(res.statusCode).toBe(401);
          expect(res.body.errorCode).toBe(ErrorCodes.CLIENT.UNAUTHENTICATED);
          expect(res.body.message).toBe(responseMessages.AUTH.INVALID_TOKEN);
        });

        it('should return 400, if data is not provided/incomplete', async () => {
          const { put } = authRequest(token!);

          const res = await put('/api/v1/auth/signupdetails').send({});
          expect(res.statusCode).toBe(400);
          expect(res.body.errorCode).toBe(ErrorCodes.CLIENT.MISSING_INVALID_INPUT);
          expect(res.body.message).toBeDefined();
        });
      });
    });
    describe.sequential('Interest', () => {
      let token2: string | null = null;
      let email2: string | null = null;
      beforeAll(async () => {
        email2 = 'SignupSuccessforInterests@example.com';
        await TempUser.create({ email: email2, emailVerified: true });

        const res = await request(app)
          .post('/api/v1/auth/signup')
          .send({
            ...generateUniqueUser('SignupSuccessforInterests'),
            email: email2,
          });

        expect(res.statusCode).toBe(201);
        token2 = res.body.token;
      });
      describe.sequential('✅ Success Cases', () => {
        it('should return 200 & redirectUrl, if valid interests are provided, without add Info', async () => {
          const { put } = authRequest(token2!);

          const res = await put('/api/v1/auth/signupinterest').send({
            interests: ['1', '2', '3'],
          });
          expect(res.statusCode).toBe(200);
          expect(res.body.status).toBe('success');
          expect(res.body.message).toBe(responseMessages.AUTH.REDIRECT_TO_DETAILS);
          expect(res.body.redirectUrl).toBe(appConfig.urls.signupAdditionalDetailsUrl);
          expect(res.body.authenticated).toBe(true);
          expect(res.body.data.user).toBeDefined();
          expect(res.body.data.user).toBeTypeOf('object');
        });

        it('should return 200, if valid interests are provided', async () => {
          const { put } = authRequest(token!);

          const res = await put('/api/v1/auth/signupinterest').send({
            interests: ['1', '2', '3'],
          });
          expect(res.statusCode).toBe(200);
          expect(res.body.status).toBe('success');
          expect(res.body.message).toBe(responseMessages.GENERAL.SUCCESS);
          expect(res.body.redirectUrl).toBeUndefined();
          expect(res.body.authenticated).toBe(true);
          expect(res.body.data.user).toBeDefined();
          expect(res.body.data.user).toBeTypeOf('object');
        });
      });

      describe.sequential('❌ Failure Cases', () => {
        it('should return 401, if auth token is not provided', async () => {
          const res = await request(app).put('/api/v1/auth/signupinterest').send({});
          expect(res.statusCode).toBe(401);
          expect(res.body.errorCode).toBe(ErrorCodes.SIGNUP.REDIRECT_TO_LOGIN);
          expect(res.body.message).toBe(responseMessages.AUTH.NO_TOKEN);
        });

        it('should return 401, if invalid auth token', async () => {
          const invalidToken = 'ded';
          const { put } = authRequest(invalidToken);

          const res = await put('/api/v1/auth/signupinterest').send({ interests: ['filled'] });
          expect(res.statusCode).toBe(401);
          expect(res.body.errorCode).toBe(ErrorCodes.CLIENT.UNAUTHENTICATED);
          expect(res.body.message).toBe(responseMessages.AUTH.INVALID_TOKEN);
        });

        it('should return 406, if required interests is not provided', async () => {
          const { put } = authRequest(token!);

          const withInterestsInfoRes = await put('/api/v1/auth/signupinterest').send({ interests: [] });
          expect(withInterestsInfoRes.statusCode).toBe(406);
          expect(withInterestsInfoRes.body.errorCode).toBe(ErrorCodes.CLIENT.MISSING_INVALID_INPUT);
          expect(withInterestsInfoRes.body.message).toBe(responseMessages.DATA.INTERESTS_LENGTH);
        });
      });
    });
  });

  describe('User login', () => {
    const email = 'v3p51435@gmail.com';
    const password = 'Test@1234';
    describe.sequential('✅ Success Cases', () => {
      it('should return 200, if user logins', async () => {
        const res = await request(app).post('/api/v1/auth/login').send({ email, password });

        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.message).toBe(responseMessages.GENERAL.SUCCESS);
        expect(res.body.authenticated).toBe(true);
        expect(res.body.data.user).toBeDefined();
        expect(res.body.data.user).toBeTypeOf('object');
      });
    });

    describe.sequential('❌ Failure Cases', () => {
      it('should return 400, if data is not provided', async () => {
        const res = await request(app).post('/api/v1/auth/login').send({ email });
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe(responseMessages.AUTH.INCOMPLETE_CREDENTIALS);
        expect(res.body.errorCode).toBe(ErrorCodes.SIGNUP.INCOMPLETE_CREDENTIALS);
      });

      it('should return 400, if user does not exist', async () => {
        const res = await request(app).post('/api/v1/auth/login').send({ email: 'example@example.com', password });
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe(responseMessages.AUTH.INCORRECT_CREDENTIALS);
        expect(res.body.errorCode).toBe(ErrorCodes.LOGIN.INVALID_CREDENTIALS);
      });

      it('should return 401, if wrong password entered', async () => {
        const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'deadMan' });
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe(responseMessages.AUTH.INCORRECT_CREDENTIALS);
        expect(res.body.errorCode).toBe(ErrorCodes.LOGIN.INVALID_CREDENTIALS);
      });
    });
  });
});
