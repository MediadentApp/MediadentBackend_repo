import mongoose, { Document, Model, Schema } from 'mongoose';
import validator from 'validator';

import User from './userModel';
import AppError from '@src/utils/appError';
import { sanitizeUpdate } from '@src/utils/util';

interface IEducation extends Document {
  country: string;
  state: string;
  city: string;
  school: {
    name: string;
    board: string;
    passoutYear: string;
    marks: number;
  };
  juniorCollege: {
    name: string;
    board: string;
    passoutYear: string;
    stream: string;
  };
  seniorCollege: {
    name: string;
    university: string;
    degree: string;
    fieldOfStudy: string;
    startYear: string;
    completionYear: string;
    gpa?: number;
  };
  externalExams: {
    examName: string;
    year: string;
    score?: number;
    rank?: number;
  }[];
  extracurriculars?: string[];
  certifications?: string[];
  projects?: string[];
  internships?: string[];
  user: mongoose.Types.ObjectId;
}

const isValidDateFormat = (value: string) =>
  validator.isDate(value, { format: 'YYYY-MM-DD', delimiters: ['-'], strictMode: true });

const isAfterDate = (value: string, comparisonDate?: string) =>
  (comparisonDate ? validator.isAfter(value, comparisonDate) : true);

const educationSchema = new Schema() < IEducation > ({
  country: { type: String, required: true },
  state: { type: String, required: true },
  city: { type: String, required: true },

  school: {
    name: { type: String, required: true },
    board: { type: String, required: true },
    passoutYear: {
      type: String,
      required: true,
      validate: { validator: isValidDateFormat, message: 'Passout year must be in YYYY-MM-DD format' },
    },
    marks: { type: Number, required: true },
  },

  juniorCollege: {
    name: { type: String, required: true },
    board: { type: String, required: true },
    passoutYear: {
      type: String,
      required: true,
      validate: [
        { validator: isValidDateFormat, message: 'Passout year must be in YYYY-MM-DD format' },
        {
          validator(this: IEducation, value: string) {
            return isAfterDate(value, this.school.passoutYear);
          },
          message: 'Junior college passout year must be after school passout year',
        },
      ],
    },
    stream: { type: String, required: true },
  },

  seniorCollege: {
    name: { type: String, required: true },
    university: { type: String, required: true },
    degree: { type: String, required: true },
    fieldOfStudy: { type: String, required: true },
    startYear: {
      type: String,
      required: true,
      validate: [
        { validator: isValidDateFormat, message: 'Start year must be in YYYY-MM-DD format' },
        {
          validator(this: IEducation, value: string) {
            return isAfterDate(value, this.juniorCollege.passoutYear);
          },
          message: 'Senior college start year must be after junior college passout year',
        },
      ],
    },
    completionYear: {
      type: String,
      required: true,
      validate: [
        { validator: isValidDateFormat, message: 'Completion year must be in YYYY-MM-DD format' },
        {
          validator(this: IEducation, value: string) {
            return isAfterDate(value, this.seniorCollege.startYear);
          },
          message: 'Senior college completion year must be after start year',
        },
      ],
    },
    gpa: Number,
  },

  externalExams: [
    {
      examName: { type: String, required: true },
      year: {
        type: String,
        required: true,
        validate: { validator: isValidDateFormat, message: 'Exam year must be in YYYY-MM-DD format' },
      },
      score: Number,
      rank: Number,
    },
  ],

  extracurriculars: [String],
  certifications: [String],
  projects: [String],
  internships: [String],

  user: {
    type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true
  },
});

// Post-save hook to update the User document
educationSchema.post('save', async (doc: IEducation, next) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(doc.user, { education: doc._id }, { new: true });
    if (!updatedUser) return next(new AppError('Could not update user', 404));
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-update hook to sanitize updates
educationSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as Partial<IEducation>;
  const restrictedFields = ['user'];

  // Remove restricted fields from the update object
  this.setUpdate(sanitizeUpdate(update, restrictedFields));
  next();
});

const Education: Model<IEducation> = mongoose.model < IEducation > ('Education', educationSchema);
export default Education;
