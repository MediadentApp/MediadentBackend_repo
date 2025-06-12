import mongoose from 'mongoose';

const ApiAccessLogSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    username: { type: String, required: false },
    userAgent: { type: String },
    device: {
      os: String,
      browser: String,
      platform: String,
    },
    location: {
      country: String,
      region: String,
      city: String,
      lat: Number,
      lon: Number,
    },
    timeWindow: { type: Date, required: true },
  },
  { timestamps: true }
);

ApiAccessLogSchema.index({ ip: 1, 'device.os': 1, 'device.browser': 1, timeWindow: 1 }, { unique: true });

export const ApiAccessLog = mongoose.model('ApiAccessLog', ApiAccessLogSchema);
