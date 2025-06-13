const fieldsToSanitize = {
    firstName: 'escape',
    lastName: 'escape',
    email: 'normalizeEmail',
    userId: 'escape',
    userBid: 'escape',
    userAId: 'escape',
    bio: 'escape',
};
export default fieldsToSanitize;
