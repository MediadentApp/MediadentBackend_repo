const mongoose = require('mongoose');
const validator = require('validator');
const User = require('./userModel');
const AppError = require('@src/utils/appError');
const { sanitizeUpdate, findKeyValues } = require('@src/utils/util');

const isValidDateFormat = (value) => {
  return validator.isDate(value, { format: "YYYY-MM-DD", delimiters: ["-"], strictMode: true });
};

const isAfterDate = (value, comparisonDate) => validator.isAfter(value, comparisonDate);

const isBeforeDate = (value, comparisonDate) => validator.isBefore(value, comparisonDate);

const educationSchema = new mongoose.Schema({
  country: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  school: {
    name: {
      type: String,
      required: true
    },
    board: {
      type: String,
      required: true
    },
    passoutYear: {
      type: String,
      required: true,
      validate: [
        {
          validator: isValidDateFormat,
          message: 'Passout year must be in the format \''
        }
      ]
    },
    marks: {
      type: Number,
      required: true
    }
  },
  juniorCollege: {
    name: {
      type: String,
      required: true
    },
    board: {
      type: String,
      required: true
    },
    passoutYear: {
      type: String,
      required: true,
      validate: [
        {
          validator: isValidDateFormat,
          message: 'Passout year must be in the format \''
        },
        {
          validator: function (value) {
            return isAfterDate(value,this.school.passoutYear); // Ensure junior college passout year is after school passout year
          },
          message: 'Junior college passout year must be after school passout year'
        }
      ]
    },
    stream: {
      type: String,
      required: true
    }
  },
  seniorCollege: {
    name: {
      type: String,
      required: true
    },
    university: {
      type: String,
      required: true
    },
    degree: {
      type: String,
      required: true
    },
    fieldOfStudy: {
      type: String,
      required: true
    },
    startYear: {
      type: String,
      required: true,
      validate: [
        {
          validator: isValidDateFormat,
          message: 'Start year must be in the format \''
        },
        {
          validator: function (value) {
            return isAfterDate(value,this.juniorCollege.passoutYear); // Ensure senior college start year is after junior college passout year
          },
          message: 'Senior college start year must be after junior college passout year'
        }
      ]
    },
    completionYear: {
      type: String,
      required: true,
      validate: [
        {
          validator: isValidDateFormat,
          message: 'Completion year must be in the format \''
        },
        {
          validator: function (value) {
            return isAfterDate(value, this.seniorCollege.startYear); // Ensure senior college completion year is after start year
          },
          message: 'Senior college completion year must be after start year'
        }
      ]
    },
    gpa: {
      type: Number
    }
  },
  externalExams: [
    {
      examName: {
        type: String,
        required: true
      },
      year: {
        type: String,
        required: true,
        validate: [
          {
            validator: isValidDateFormat,
            message: 'Exam year must be in the format \''
          }
        ]
      },
      score: {
        type: Number
      },
      rank: {
        type: Number
      }
    }
  ],
  extracurriculars: [String],
  certifications: [String],
  projects: [String],
  internships: [String],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  }
});

educationSchema.post('save', async function (doc, next) {
  try {
    const updatedUser = await User.findByIdAndUpdate(doc.user, { education: doc._id }, { new: true });
    if (!updatedUser) {
      return next(new AppError(`Could not update user`, 404));
    }
    next();
  } catch (error) {
    next(error);
  }
});

educationSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  const restrictedFields = ['user']; // Fields you want to restrict

  // Remove restricted fields from the update object
  this.setUpdate(sanitizeUpdate(update, restrictedFields)); // Set the filtered update object
  next();
});

const Education = mongoose.model('Education', educationSchema);

module.exports = Education;
