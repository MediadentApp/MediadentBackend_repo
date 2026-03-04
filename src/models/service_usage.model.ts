import { AI_SERVICES, ALL_AI_MODELS, AppUsageMonthlyDTO } from '@vin51435/studenhub-contracts';
import { model, Schema } from 'mongoose';

const appUsageMonthlySchema = new Schema<AppUsageMonthlyDTO>(
  {
    year: {
      type: Number,
      required: true,
      validate: {
        validator: (year: number) => year >= 2000 && year <= 2100,
        message: 'Year must be between 2000 and 2100',
      },
    },
    month: {
      type: Number,
      required: true,
      validate: {
        validator: (month: number) => month >= 1 && month <= 12,
        message: 'Month must be between 1 and 12',
      },
    },

    service: {
      type: String,
      enum: Object.values(AI_SERVICES),
      required: true,
    },

    model: {
      type: String,
      enum: Object.values(ALL_AI_MODELS),
    },

    requests: { type: Number, default: 0 },

    inputTokens: {
      type: Number,
      required: function (this: AppUsageMonthlyDTO): boolean {
        return this.service === 'Gemini';
      },
    },

    outputTokens: {
      type: Number,
      required: function (this: AppUsageMonthlyDTO): boolean {
        return this.service === 'Gemini';
      },
    },

    characters: {
      type: Number,
      required: function (this: AppUsageMonthlyDTO): boolean {
        return this.service === 'tts';
      },
    },

    seconds: {
      type: Number,
      required: function (this: AppUsageMonthlyDTO): boolean {
        return this.service === 'stt';
      },
    },
  },
  { timestamps: true }
);

// One document per (month, service, model)
appUsageMonthlySchema.index({ year: 1, month: 1, service: 1, model: 1 }, { unique: true });

export const AppUsageMonthly = model('AppUsageMonthly', appUsageMonthlySchema);
