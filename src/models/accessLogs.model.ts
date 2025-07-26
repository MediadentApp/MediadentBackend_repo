import mongoose from 'mongoose';

export interface IApiAccessLog {
  ip: string;
  user?: mongoose.Types.ObjectId;
  path?: string;
  username?: string;
  userAgent?: string;
  device?: {
    os?: string;
    browser?: string;
    platform?: string;
  };
  location?: {
    country?: string;
    region?: string;
    city?: string;
    lat?: number;
    lon?: number;
  };
  timeWindow?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const ApiAccessLogSchema = new mongoose.Schema<IApiAccessLog>(
  {
    ip: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    path: String,
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
    timeWindow: { type: Date },
  },
  { timestamps: true }
);

ApiAccessLogSchema.index({ createdAt: 1 }); // for fast queries

export const ApiAccessLog = mongoose.model('ApiAccessLog', ApiAccessLogSchema);
