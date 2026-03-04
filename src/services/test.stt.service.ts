import speech, { protos } from '@google-cloud/speech';
import { google } from '@google-cloud/speech/build/protos/protos.js';

const client = new speech.SpeechClient();

function getEncoding(mimeType: string): google.cloud.speech.v1.RecognitionConfig.AudioEncoding {
  if (mimeType.includes('webm')) return 9; // WEBM_OPUS
  if (mimeType.includes('wav')) return 1; // LINEAR16
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 8; // MP3
  return 0; // Let Google auto-detect
}

export async function speechToText(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const audioBytes = audioBuffer.toString('base64');

  const encoding = getEncoding(mimeType);

  const request: protos.google.cloud.speech.v1.IRecognizeRequest = {
    audio: {
      content: audioBytes,
    },
    config: {
      encoding,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      // Different Standard Models:
      // model: 'default', // Basic standard model
      model: 'latest_long', // Your current one (best for your use case)
      // model: 'command_and_search', // Fast, for 1-2 word inputs
    },
  };

  // ⚠️ sampleRateHertz MUST be omitted for MP3 / WEBM
  if (encoding === 1) {
    // LINEAR16
    request.config!.sampleRateHertz = 48000;
  }

  const data = await client.recognize(request);

  const transcript = data[0].results
    ?.map(r => r.alternatives?.[0]?.transcript)
    .join(' ')
    .trim();

  return transcript || '';
}
