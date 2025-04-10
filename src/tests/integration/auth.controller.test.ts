import { app } from '#src/app.js';
import { ErrorCodes } from '#src/config/errorCodes.js';
import TempUser from '#src/models/tempUserModel.js';
import User from '#src/models/userModel.js';
import request from 'supertest';
import { describe, it, expect } from 'vitest';

describe('Auth', () => {
  describe('Auth API - Email Registration', () => {
    describe('✅ Success Cases', () => {
      it('should register a new user with a valid email', async () => {
        const res = await request(app).post('/api/v1/auth/emailReg').send({
          email: 'test@example.com',
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.message).toBeDefined();
        expect(res.body.data).toHaveProperty('email');
        expect(await TempUser.findOne({ email: 'test@example.com' })).not.toBeNull();
      });

      it('should return 200 if email is already verified', async () => {
        // Insert a user in User before testing
        await TempUser.create({ email: 'tempVarifiedEmail@example.com', emailVerified: true });

        const res = await request(app).post('/api/v1/auth/emailReg').send({
          email: 'tempVarifiedEmail@example.com',
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.message).toBeDefined();
        expect(res.body.data).toHaveProperty('email');
      });
    });

    describe('❌ Failure Cases', () => {
      it('should return 400 if no email is provided', async () => {
        const res = await request(app).post('/api/v1/auth/emailReg').send({});

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe(ErrorCodes.SIGNUP.INCOMPLETE_CREDENTIALS);
        expect(res.body.message).toBe('Email is required');
      });

      it('should return 400 if an invalid email is provided', async () => {
        const res = await request(app).post('/api/v1/auth/emailReg').send({
          email: 'invalid-email',
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.status).toBe('fail');
        expect(res.body.errorCode).toBe(ErrorCodes.CLIENT.INVALID_EMAIL);
      });

      it('should return 400 if email if OTP is already sent', async () => {
        const res = await request(app).post('/api/v1/auth/emailReg').send({
          email: 'test@example.com',
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.status).toBe('fail');
        expect(res.body.errorCode).toBe(ErrorCodes.SIGNUP.OTP_ALREADY_SENT);
      });
    });
  });
});
