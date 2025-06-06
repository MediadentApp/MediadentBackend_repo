import appConfig from '#src/config/appConfig.js';
import User from '#src/models/userModel.js';
import { UserRole } from '#src/types/enum.js';
import { IUser } from '#src/types/model.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

/**
 * Direct User insertion will not hash password, passwordConfirm and passwordChangedAt
 * Unique email and username must also be directly provided.
 */

export const dropCollection = async () => {
  const collections = mongoose.connection.collections;

  const keepCollections = ['userformats', 'colleges', 'universities', 'citystates']; // collection names you want to keep

  for (const key in collections) {
    if (!keepCollections.includes(key)) {
      await collections[key].deleteMany({});
    }
  }
};

const seedDatabase = async () => {
  const pass = await bcrypt.hash('Test@1234', appConfig.bycryptHashSalt);
  await User.insertMany([
    {
      firstName: 'Vin',
      lastName: 'P',
      fullName: 'vin p',
      email: 'v3p51435@gmail.com',
      username: 'vinp',
      password: pass,
      passwordConfirm: pass,
      manualSignup: true,
      role: UserRole.Admin,
      accountStatus: 'active',
      additionalInfo: generateUserDetails(),
      interests: ['coding', 'reading', 'sleeping'],
    },
  ]);
};

const generateUniqueUser = (
  uniqueString: string = String(Math.floor(Math.random() * 1e6).toString(16))
): Partial<IUser> => ({
  firstName: `Vin${uniqueString}`,
  lastName: `P${uniqueString}`,
  email: `${uniqueString.toLowerCase()}@test.com`,
  username: `vinp${uniqueString}`,
  password: `Test@1234`,
  passwordConfirm: `Test@1234`,
  manualSignup: true,
  role: UserRole.User,
  accountStatus: 'active',
  additionalInfo: generateUserDetails(),
  interests: ['coding', 'reading', 'sleeping'],
});

const generateUserDetails = (): IUser['additionalInfo'] => ({
  userType: 'student',
  gender: 'male',
  institute: 'Mumbai University',
  currentCity: 'Mumbai',
});

export default seedDatabase;
export { generateUniqueUser, generateUserDetails };
