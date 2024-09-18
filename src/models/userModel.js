const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const UserFormat = require('./userFormat');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please tell us your First Name!']
  },
  lastName: {
    type: String,
    required: [true, 'Please tell us your Last Name!']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'] // From the Validator Module
  },
  username: {
    type: String,
    unique: true,
    required: false
  },
  password: {
    type: String,
    required: function () {
      return (!this.googleAccount && !this.githubAccount && !this.linkedinAccount); // Password is required only if googleAccount,etc is false
    },
    minLength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: function () {
      return (!this.googleAccount && !this.githubAccount && !this.linkedinAccount); // Password is required only if googleAccount,etc is false
    },
    validate: {
      // This will only work on CREATE & SAVE, and not on func like findOneAndUpdate, etc
      // Because mongoose doesn't keep the current obj in memory
      // So use SAVE on updating the password
      validator: function (value) {
        return value === this.password; //Should return either true or false
      },
      message: 'Passwords do not match'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  manualSignup: {
    type: Boolean,
    default: false
  },
  googleAccount: {
    type: Boolean,
    default: false
  },
  githubAccount: {
    type: Boolean,
    default: false
  },
  github_url: {
    type: String,
    required: function () {
      return this.githubAccount;
    }
  },
  linkedinAccount: {
    type: Boolean,
    default: false
  },
  education: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Education',
    unique: true,
    required: false
  },
  userType: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    required: true
  },
  organization: {
    type: String,
    required: true
  },
  currentCity: {
    type: String,
    required: true
  },
});

// This will run between getting the data from client and saving it to DB
userSchema.pre('save', async function (next) {
  // Hash password if modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
    this.passwordConfirm = undefined;

    // Set passwordChangedAt if password is changed
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000; // Subtract 1 sec for DB save time
    }
  }

  // Generate username if not present
  if (!this.username) {
    const emailPrefix = this.email.split('@')[0];
    const uniqueSuffix = Math.floor(Math.random() * 10000); // Generate a unique suffix
    this.username = `${emailPrefix}-${uniqueSuffix}`;
  }

  next();
});

// Pre-save middleware to validate userType and gender from the DB
userSchema.pre('save', async function (next) {
  const userFormat = await UserFormat.findOne(); // Fetch the format options from DB

  if (!userFormat) {
    return next(new Error('User format not defined in database.'));
  }

  // Validate userType
  if (!userFormat.userType.includes(this.userType)) {
    return next(new Error('Invalid userType.'));
  }

  // Validate gender
  if (!userFormat.userGenders.includes(this.gender)) {
    return next(new Error('Invalid gender.'));
  }

  next();
});

// This is Instance Method
// This method will be available on all document in the collection
// This is a method to check user's password (ex. on login)
userSchema.methods.correctPassword = async function (candidatePassword, userPasswordInDB) {
  return await bcrypt.compare(candidatePassword, userPasswordInDB);
};

userSchema.methods.changedPasswordAfter = function (JwtTimestamp) {
  if (this.passwordChangedAt) {
    // Getting timestamp in seconds
    const passwordChangeTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    // console.log(this.passwordChangedAt, JwtTimestamp);
    return JwtTimestamp < passwordChangeTimeStamp;
  }

  // False means NOT CHANGED
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // It is like a password to reset password
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //10mins
  // Your need to call save() after calling createPasswordResetToken() to save token and expiration
  // console.log({ resetToken }, this.passwordResetToken, this.passwordResetExpires);

  // Sending unencrypted reset token
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
