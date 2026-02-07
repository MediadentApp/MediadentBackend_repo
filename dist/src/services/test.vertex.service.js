import { VertexAI } from '@google-cloud/vertexai';
const vertexAI = new VertexAI({
    project: process.env.GCP_PROJECT_ID,
    location: process.env.GCP_LOCATION
});
const model = vertexAI.getGenerativeModel({
    model: 'gemini-1.5-pro'
});
export async function generateQuestionsWithVertex({ type, topic, difficulty, count }) {
    const prompt = `
You are an interview question generator.

Interview Type: ${type}
Topic: ${topic}
Difficulty: ${difficulty}

Generate ${count} interview questions.

RULES:
- Each question must be spoken-friendly
- No multi-part questions
- No numbering in text
- No explanations
- Return STRICT JSON only in this format:

{
  "questions": [
    { "id": 1, "text": "question here" }
  ]
}
`;
    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024
        }
    });
    const rawText = result?.response?.candidates?.[0].content.parts[0].text;
    // Hard safety: parse only JSON
    const parsed = JSON.parse(rawText || '{}');
    return parsed.questions;
}
