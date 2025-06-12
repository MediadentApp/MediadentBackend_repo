import mongoose from 'mongoose';

const ApiAccessLogSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    userAgent: String,
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
    timeWindow: { type: Date }, // optional now
  },
  { timestamps: true } // enables `createdAt` and `updatedAt`
);

ApiAccessLogSchema.index({ createdAt: 1 }); // optional for fast queries

export const ApiAccessLog = mongoose.model('ApiAccessLog', ApiAccessLogSchema);
