import { INTERVIEW_DIFFICULTIES, INTERVIEW_STATUS, INTERVIEW_TYPES } from '@vin51435/studenhub-contracts';
import { IPrepPalSession } from '#src/types/model.js';
import { Schema, model } from 'mongoose';

const PrepPalSessionSchema = new Schema<IPrepPalSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    userUsageId: {
      type: Schema.Types.ObjectId,
      ref: 'UserUsage',
      required: true,
      index: true,
    },

    interviewType: {
      type: String, // technical | hr | system-design | mixed
      required: true,
      enum: Object.values(INTERVIEW_TYPES),
    },

    topic: {
      type: String, // Node.js, React, HR, etc.
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(INTERVIEW_STATUS),
      default: INTERVIEW_STATUS.IN_PROGRESS,
    },

    finalScore: {
      type: Number, // 0–10
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
    },

    currentQuestionIndex: {
      type: Number,
      default: 0,
    },

    config: {
      difficulty: {
        type: String, // junior | mid | senior
        enum: Object.values(INTERVIEW_DIFFICULTIES),
        required: true,
      },

      maxQuestions: {
        type: Number,
        required: true,
      },

      timePerQuestionSec: {
        type: Number,
        required: true,
      },

      voiceEnabled: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

export const PrepPalSession = model('PrepPalSession', PrepPalSessionSchema);
