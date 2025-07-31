// ./erd-models/apiAccessLog.js
import mongoose from 'mongoose';

const ApiAccessLogSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    path: String,
  },
  { timestamps: true }
);

export default mongoose.model('ApiAccessLog', ApiAccessLogSchema);
