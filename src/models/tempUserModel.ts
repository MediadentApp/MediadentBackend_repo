import mongoose, { Document, Model, Schema } from 'mongoose';
import validator from 'validator';

import config from '../config/config';

interface ITempUser extends Document {
  email: string;
  otp?: number;
  otpSendAt?: Date;
  otpExpiration?: Date;
  emailVerified?: boolean;
  checkOtpTime(): boolean;
  checkOtp(otp: number): boolean;
  checkOtpExpiration(): boolean;
}

const tempUserSchema = new Schema<ITempUser>({
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'], // Validator Module
  },
  otp: Number,
  otpSendAt: Date,
  otpExpiration: Date,
  emailVerified: Boolean,
});

tempUserSchema.methods.checkOtpTime = function (): boolean {
  if (!this.otpSendAt) return false;
  const sendOtpAfterMilliseconds = config.otp.sendOtpAfter * 60 * 1000;
  const otpSendAtWithDelay = new Date(
    this.otpSendAt.getTime() + sendOtpAfterMilliseconds,
  );
  return otpSendAtWithDelay > new Date();
};

tempUserSchema.methods.checkOtp = function (otp: number): boolean {
  return this.otp === otp;
};

tempUserSchema.methods.checkOtpExpiration = function (): boolean {
  if (!this.otpExpiration) return true;
  return this.otpExpiration < new Date();
};

const TempUser: Model<ITempUser> = mongoose.model<ITempUser>(
  'TempUser',
  tempUserSchema,
);
export default TempUser;
