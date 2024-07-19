// authUtils.js
const jwt = require('jsonwebtoken'); // Ensure you have jsonwebtoken package installed

const signToken = id => (
  jwt.sign(
    { id: id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  )
);

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Remove password from output
  if (user.password) {
    user.password = undefined;
  }

  res.status(statusCode).json({
    status: 'success',
    code: statusCode,
    token,
    data: {
      user
    }
  });
};

module.exports = { signToken, createSendToken };
