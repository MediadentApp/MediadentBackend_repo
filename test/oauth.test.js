const request = require('supertest');
const mongoose = require('mongoose');
const app = require('@src/app.js'); // Path to your Express app
const User = require("@src/models/userModel");
const { MongoMemoryServer } = require('mongodb-memory-server');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

// Start an in-memory MongoDB instance for testing
let mongoServer;
let mock;

// Set up before all tests, Initialization
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  mongoose.connect(uri).then(() => console.log('mongodb instance created for test'));
  mock = new MockAdapter(axios);
}, 30000);

// Clean up after each test
afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
  await User.deleteMany(); // Clean the User collection
  mock.reset(); // Reset the mock after each test
});

// Close the in-memory database and Mongo connection
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
}, 30000);

describe('Google OAuth Tests', () => {
  it('should redirect to Google OAuth URL', async () => {
    const res = await request(app).get('/oauth2/google');
    expect(res.statusCode).toBe(302); // Expect a redirect
    expect(res.header.location).toMatch(/accounts\.google\.com\/o\/oauth2\/v2\/auth/); // Check if the redirect URL contains Google OAuth
  });

  it('should handle the Google OAuth callback', async () => {
    const mockAccessTokenResponse = {
      data: { access_token: 'mockAccessToken' }
    };

    const mockUserResponse = {
      data: {
        given_name: 'John',
        family_name: 'Doe',
        email: 'v3p51435@gmail.com',
        verified_email: true,
        picture: 'http://example.com/picture.jpg',
      }
    };

    // Mock the token request
    mock.onPost('https://oauth2.googleapis.com/token').reply(200, mockAccessTokenResponse);

    // Mock the user info request
    mock.onGet('https://www.googleapis.com/oauth2/v2/userinfo').reply(200, mockUserResponse);

    const res = await request(app).get('/oauth2/google/callback?code=mockAuthCode'); // Simulate the callback with a mock code

    expect(res.statusCode).toBe(201); // Check for successful user creation
    const user = await User.findOne({ email: mockUserResponse.email });
    expect(user).not.toBeNull(); // Verify the user exists in the database
    expect(user.googleAccount).toBe(true); // Check if the Google account flag is set
  }, 30000);

  it('should handle error when token request fails', async () => {
    mock.onPost('https://oauth2.googleapis.com/token').reply(500); // Simulate a token request failure

    const res = await request(app).get('/api/v1/auth/google/callback?code=mockAuthCode');

    expect(res.statusCode).toBe(500); // Expect a 500 status for internal server error
    expect(res.text).toBe('Authentication failed'); // Verify error message
  });

  it('should handle error when user email is not verified', async () => {
    const mockAccessTokenResponse = {
      access_token: 'mockAccessToken',
    };

    const mockUserResponse = {
      given_name: 'John',
      family_name: 'Doe',
      email: 'johndoe@example.com',
      verified_email: false, // Simulate unverified email
      picture: 'http://example.com/picture.jpg',
    };

    mock.onPost('https://oauth2.googleapis.com/token').reply(200, mockAccessTokenResponse);
    mock.onGet('https://www.googleapis.com/oauth2/v2/userinfo').reply(200, mockUserResponse);

    const res = await request(app).get('/api/v1/auth/google/callback?code=mockAuthCode');

    expect(res.statusCode).toBe(401); // Expect 401 for unverified email
    expect(res.body.error).toBe('Your email is not verified by Google'); // Check error message
  });
});