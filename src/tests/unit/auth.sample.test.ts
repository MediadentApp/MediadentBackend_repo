import { describe, it, expect, vi, beforeEach, test, Mock } from 'vitest';
import request from 'supertest';
import { app } from '#src/app.js';
import { ErrorCodes } from '#src/config/errorCodes.js';

describe.skip('Auth', () => {
  describe('Signup', () => {
    describe('Email Registration', () => {
      describe('Given an no email', () => {
        it('Should return an error message', async () => {
          const response = await request(app).post('/api/v1/auth/emailReg');
          expect(response.statusCode).toBe(400);
          expect(response.body.errorCode).toBe(ErrorCodes.SIGNUP.INCOMPLETE_CREDENTIALS);
          expect(response.body.message).toBeDefined();
        });
      });

      describe('Given an invalid email', () => {
        it('Should return an error message', async () => {
          const response = await request(app).post('/api/auth/emailReg').send({ email: 'Envalid-Email' });
          expect(response.statusCode).toBe(400);
          expect(response.body.errorCode).toBe(ErrorCodes.CLIENT.INVALID_EMAIL);
          expect(response.body.message).toBeDefined();
        });
      });
    });
  });
});
