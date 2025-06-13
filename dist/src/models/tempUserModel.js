import mongoose, { Schema } from 'mongoose';
import validator from 'validator';
import appConfig from '../config/appConfig.js';
const tempUserSchema = new Schema({
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
tempUserSchema.pre('save', async function (next) {
    if (!this.emailVerified) {
        this.otpSendAt = new Date();
        this.otpExpiration = new Date(Date.now() + appConfig.otp.otpExpiration * 60 * 1000);
    }
    next();
});
tempUserSchema.methods.checkOtpTime = function () {
    if (!this.otpSendAt)
        return false;
    const sendOtpAfterMilliseconds = appConfig.otp.sendOtpAfter * 1000;
    const otpSendAtWithDelay = new Date(this.otpSendAt.getTime() + sendOtpAfterMilliseconds);
    return otpSendAtWithDelay > new Date();
};
tempUserSchema.methods.checkOtp = function (otp) {
    return this.otp === otp;
};
tempUserSchema.methods.checkOtpExpiration = function () {
    if (!this.otpExpiration)
        return true;
    return this.otpExpiration < new Date();
};
const TempUser = mongoose.model('TempUser', tempUserSchema);
export default TempUser;
