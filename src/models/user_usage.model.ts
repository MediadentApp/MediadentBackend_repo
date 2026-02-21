import { AI_SERVICES, ALL_AI_MODELS } from '@vin51435/studenhub-contracts';
import { IUserUsage } from '#src/types/model.js';
import { model, Schema } from 'mongoose';

const userUsageSchema = new Schema<IUserUsage>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    ip: { type: String, required: true },

    date: { type: Date, default: Date.now },

    service: {
      type: String,
      enum: Object.values(AI_SERVICES),
      required: true,
    },

    model: {
      type: String,
      enum: Object.values(ALL_AI_MODELS),
      required: true,
    },

    inputTokens: {
      type: Number,
      required: function (this: IUserUsage): boolean {
        return this.service === 'Gemini';
      },
    },

    outputTokens: {
      type: Number,
      required: function (this: IUserUsage): boolean {
        return this.service === 'Gemini';
      },
    },

    characters: {
      type: Number,
      required: function (this: IUserUsage): boolean {
        return this.service === 'tts';
      },
    },

    seconds: {
      type: Number,
      required: function (this: IUserUsage): boolean {
        return this.service === 'stt';
      },
    },

    requests: { type: Number, default: 1 },
  },
  { timestamps: true }
);

userUsageSchema.index({ user: 1, service: 1, date: 1 });

export const UserUsage = model('UserUsage', userUsageSchema);
