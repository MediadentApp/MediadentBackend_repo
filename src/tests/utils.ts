import request from 'supertest';
import { app } from '#src/app.js';

export const authRequest = (cookie: string) => {
  return {
    get: (url: string) => request(app).get(url).set('Cookie', cookie),
    post: (url: string) => request(app).post(url).set('Cookie', cookie),
    put: (url: string) => request(app).put(url).set('Cookie', cookie),
    delete: (url: string) => request(app).delete(url).set('Cookie', cookie),
  };
};

export const extractCookieFromRes = (res: any) => {
  let token: string | undefined;

  const rawCookies = res.headers['set-cookie'];

  if (Array.isArray(rawCookies)) {
    // Find the cookie that starts with "token="
    token = rawCookies.find(cookieStr => cookieStr.startsWith('token='));
  } else if (typeof rawCookies === 'string') {
    // Only one cookie returned, directly assign if it's the token
    if (rawCookies.startsWith('token=')) {
      token = rawCookies;
    }
  }

  if (!token) {
    throw new Error('Token cookie not found in login response');
  }

  return token;
};
