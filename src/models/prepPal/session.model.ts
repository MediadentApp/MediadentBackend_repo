import { PrepPalSessionDB } from '#src/types/model.js';
import { INTERVIEW_DIFFICULTIES, INTERVIEW_STATUS, INTERVIEW_TYPES } from '@vin51435/studenhub-contracts';
import { HydratedDocument, Schema, model } from 'mongoose';

const PrepPalSessionSchema = new Schema<PrepPalSessionDB>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    userUsage: {
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

    finalScore: Number, // 0–10

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: Date,

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

export type PrepPalSessionDocument = HydratedDocument<PrepPalSessionDB>;

export const PrepPalSessionModel = model<PrepPalSessionDB>('PrepPalSession', PrepPalSessionSchema);
