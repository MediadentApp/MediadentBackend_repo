import { IPrepPalAnswer } from '#src/types/model.js';
import { Schema, model } from 'mongoose';

const PrepPalAnswerSchema = new Schema<IPrepPalAnswer>(
  {
    session: {
      type: Schema.Types.ObjectId,
      ref: 'PrepPalSession',
      required: true,
      index: true,
    },

    question: {
      type: Schema.Types.ObjectId,
      ref: 'PrepPalQuestion',
      required: true,
      index: true,
    },

    // Text answer (from STT or typed)
    transcript: {
      type: String,
      required: true,
    },

    // Optional audio metadata
    audio: {
      url: String,
      durationSec: Number,
      mimeType: String,
    },

    // AI evaluation
    evaluation: {
      score: {
        type: Number, // 0–10
        min: 0,
        max: 10,
      },
      feedback: String,
      strengths: [String],
      improvements: [String],
    },

    answeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

PrepPalAnswerSchema.index({ session: 1, question: 1 }, { unique: true });

export const PrepPalAnswer = model('PrepPalAnswer', PrepPalAnswerSchema);
