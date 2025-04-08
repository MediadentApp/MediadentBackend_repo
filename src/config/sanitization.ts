import validator from 'validator';

type SanitizeMethods = keyof typeof validator;

const fieldsToSanitize: Record<string, SanitizeMethods> = {
  firstName: 'escape',
  lastName: 'escape',
  email: 'normalizeEmail',
  userId: 'escape',
  userBid: 'escape',
  userAId: 'escape',
  bio: 'escape',
};

export default fieldsToSanitize;
