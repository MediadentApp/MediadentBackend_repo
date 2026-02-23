import { z } from 'zod';

const createSessionSchema = {
  body: z.object({
    title: z.string(),
    duration: z.number(),
  }),
  // query: z.object({ ... }),
  // params: z.object({ ... }),
};

export { createSessionSchema };
export type CreateSessionBody = z.infer<typeof createSessionSchema.body>;
