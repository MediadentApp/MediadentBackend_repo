import { QUESTION_STATUS } from '#src/types/enum.js';
import { IPrepPalQuestion } from '#src/types/model.js';
import { model, Schema } from 'mongoose';

const PrepPalQuestionSchema = new Schema<IPrepPalQuestion>({
  session: {
    type: Schema.Types.ObjectId,
    ref: 'PrepPalSession',
    required: true,
  },
  index: { type: Number, required: true, min: 0 },
  question: String,
  status: {
    type: String,
    enum: Object.values(QUESTION_STATUS),
    default: QUESTION_STATUS.PENDING,
  },
});

PrepPalQuestionSchema.index({ session: 1, index: 1 }, { unique: true });

export const PrepPalQuestion = model('PrepPalQuestion', PrepPalQuestionSchema);
