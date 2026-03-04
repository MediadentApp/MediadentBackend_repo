import { INTERVIEW_DIFFICULTIES, INTERVIEW_TYPES } from '@vin51435/studenhub-contracts';
import { z } from 'zod';

const createSessionSchema = {
  // add hardcoded settings config & MORE strict body checks
  body: z.object({
    interviewType: z.enum(Object.values(INTERVIEW_TYPES)),
    topic: z.string(),
    config: z.object({
      difficulty: z.enum(Object.values(INTERVIEW_DIFFICULTIES)),
      maxQuestions: z.number().min(1).max(100),
      voiceEnabled: z.boolean().default(false),
      timePerQuestionSec: z.number().min(1).max(60),
    }),
  }),
  // query: z.object({ ... }),
  // params: z.object({ ... }),
};

export { createSessionSchema };
export type CreateSessionBody = z.infer<typeof createSessionSchema.body>;
