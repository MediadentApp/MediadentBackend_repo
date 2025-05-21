import { app } from '#src/app.js';
import request from 'supertest';
import responseMessages from '#src/config/constants/responseMessages.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { authRequest, extractCookieFromRes } from '#src/tests/utils.js';
import * as fs from 'fs';

let token: string | undefined;

beforeAll(async () => {
  const email = 'v3p51435@gmail.com';
  const password = 'Test@1234';
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });

  token = extractCookieFromRes(res);
});

describe.skip('Post Tests:', () => {
  describe('✅ Success Cases', () => {
    it('should save post', async () => {
      const { post } = authRequest(token!);

      const catFile = fs.readFileSync('c:/Users/cnoronha/Pictures/Stock Images/CAT.jpg');
      const cat700File = fs.readFileSync('c:/Users/cnoronha/Pictures/Stock Images/CAT-700.jpg');

      const res = await post('/api/v1/user/communitypost')
        .field('title', 'Test Post')
        .field('content', 'This is a test post')
        .field('tags', ['#test', '#post'])
        .attach('files', catFile, 'CAT.jpg')
        .attach('files', cat700File, 'CAT-700.jpg');

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe(responseMessages.GENERAL.SUCCESS);
    });
  });
});
