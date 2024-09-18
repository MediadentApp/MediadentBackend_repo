const UserFormat = require('@src/models/userFormat');

const initUserFormat = async () => {
  // Check if UserFormat data already exists
  const formatExists = await UserFormat.findOne();

  if (!formatExists) {
    // Seed data only if it doesn't exist
    await UserFormat.create({
      userType: ['student', 'teacher', 'admin'],
      userGenders: ['male', 'female', 'other']
    });
    console.log('UserFormat initialized successfully');
  }
};

module.exports = initUserFormat;
