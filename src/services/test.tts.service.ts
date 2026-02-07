import textToSpeech, { protos } from '@google-cloud/text-to-speech';

const client = new textToSpeech.TextToSpeechClient();

export async function synthesizeSpeech(text: string) {
  const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
    input: { text },

    voice: {
      languageCode: 'en-US',
      name: 'en-US-Standard-C', // Standard voice, 0 to 4 million characters free
      //   name: 'en-US-Wavenet-D' // High-quality WaveNet voice, 0 to 4 million characters free
      //   name: 'en-US-Studio-O' // Studio voice, optimized for TTS, 0 to 1 million characters free
      //   name: 'en-US-Neural2-A' // for Neural2, 0 to 1 million characters
    },

    audioConfig: {
      audioEncoding: 2, // MP3

      // Studio voices sound best at 1.0 pitch and rate
      pitch: 0,
      speakingRate: 1.0,
    },
  };

  const [response] = await client.synthesizeSpeech(request);

  return response.audioContent; // Buffer (base64)
}
