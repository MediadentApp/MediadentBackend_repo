const jwt = require('jsonwebtoken'); // Ensure you have jsonwebtoken package installed

const signToken = id => (
  jwt.sign(
    { id: id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  )
);

const createSendToken = (user, statusCode, res, { redirectUrl = null } = {}) => {
  const token = signToken(user._id);

  // Remove password from output by directly setting it to undefined
  user.password = undefined;

  // Build the response object
  const response = {
    status: 'success',
    code: statusCode,
    token,
    data: { user }
  };

  // Conditionally add redirectUrl if it exists
  if (redirectUrl) {
    response.redirectUrl = redirectUrl;
  }

  // Send the response
  res.status(statusCode).json(response);
};

module.exports = { signToken, createSendToken };
