// import { ErrorCodes } from '#src/config/constants/errorCodes.js';
// import User from '#src/models/userModel.js';
// import { checkIfUserExists } from '#src/services/auth/checkUserExists.service.js';
// import { describe, it, expect, vi, beforeEach } from 'vitest';

// // Mock the User model
// vi.mock('#src/models/User.model', () => ({
//   User: {
//     findOne: vi.fn(),
//   },
// }));

// describe.only('checkIfUserExists', () => {
//   const email = 'test@example.com';

//   beforeEach(() => {
//     vi.clearAllMocks();
//   });

//   it('should return null if user does not exist', async () => {
//     (User.findOne as vi.Mock).mockResolvedValue(null);

//     const result = await checkIfUserExists(email);
//     expect(result).toBeNull();
//     expect(User.findOne).toHaveBeenCalledWith({ email });
//   });

//   it('should throw if user has manualSignup', async () => {
//     (User.findOne as vi.Mock).mockResolvedValue({ manualSignup: true });

//     await expect(checkIfUserExists(email)).rejects.toThrowError(ApiError);
//     await expect(checkIfUserExists(email)).rejects.toMatchObject({
//       statusCode: 409,
//       errorCode: ErrorCodes.SIGNUP.USER_ALREADY_EXISTS,
//       redirectPath: '/login',
//     });
//   });

//   it('should throw USE_GOOGLE_ACCOUNT if user has googleAccount', async () => {
//     (User.findOne as vi.Mock).mockResolvedValue({ manualSignup: false, googleAccount: true });

//     await expect(checkIfUserExists(email)).rejects.toMatchObject({
//       statusCode: 409,
//       errorCode: ErrorCodes.LOGIN.USE_GOOGLE_ACCOUNT,
//       redirectPath: '/login',
//     });
//   });

//   it('should throw USE_GITHUB_ACCOUNT if user has githubAccount', async () => {
//     (User.findOne as vi.Mock).mockResolvedValue({ manualSignup: false, githubAccount: true });

//     await expect(checkIfUserExists(email)).rejects.toMatchObject({
//       statusCode: 409,
//       errorCode: ErrorCodes.LOGIN.USE_GITHUB_ACCOUNT,
//       redirectPath: '/login',
//     });
//   });

//   it('should throw USE_LINKEDIN_ACCOUNT if user has linkedinAccount', async () => {
//     (User.findOne as vi.Mock).mockResolvedValue({ manualSignup: false, linkedinAccount: true });

//     await expect(checkIfUserExists(email)).rejects.toMatchObject({
//       statusCode: 409,
//       errorCode: ErrorCodes.LOGIN.USE_LINKEDIN_ACCOUNT,
//       redirectPath: '/login',
//     });
//   });
// });
