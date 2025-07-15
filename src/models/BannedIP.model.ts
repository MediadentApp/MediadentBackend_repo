import mongoose from 'mongoose';

const BannedIPSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      unique: true,
    },
    reason: {
      type: String,
      default: '',
    },
    banNetwork: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const BannedIP = mongoose.model('BannedIP', BannedIPSchema);
