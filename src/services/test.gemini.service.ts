import { createRateLimitedWithRetry } from '#src/utils/RateLimitedWithRetry.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-lite',
});

const generate = createRateLimitedWithRetry(
  model.generateContent.bind(model),
  { minTime: 1000 },
  { retries: 1, retryOn: err => err?.status === 429 }
);

export async function generateInterviewQuestionsGemini({
  type,
  topic,
  difficulty,
  count,
}: {
  type: string;
  topic: string;
  difficulty: string;
  count: number;
}) {
  const prompt = `
    Generate ${count} ${difficulty} ${type} interview questions on ${topic}.
    Rules:
    - Spoken-friendly
    - No explanations
    - No numbering

    Return JSON only:
    {"questions":[{"id":1,"text":""}]}
    `;

  //  "between `require()` and `import` in Node.js" sentence, the voice can't say any code, just the question text. This is because the TTS engine is optimized for natural language and may not handle code syntax well. If you need to include code in the questions, consider using a different format or providing the code as a separate resource.
  // Update the prompt to clarify that the questions should be spoken-friendly and not include code syntax, which may not be handled well by the TTS engine. This way, the generated questions will be more suitable for audio output.

  const result = await generate(prompt);

  const raw = result.response.text();
  const json = raw.match(/\{[\s\S]*\}/)?.[0];

  if (!json) throw new Error('Invalid JSON from Gemini');

  return JSON.parse(json).questions;
}
