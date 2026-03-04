import { synthesizeSpeech } from '#src/services/test.tts.service.js';
import { AppRequest } from '#src/types/api.request.js';
import { AppResponse } from '#src/types/api.response.js';
import ApiError from '#src/utils/ApiError.js';
import { ApiAudioResponse } from '#src/utils/ApiResponse.js';
import { NextFunction } from 'express';

export async function ttsHandler(req: AppRequest, res: AppResponse, next: NextFunction) {
  const { text } = req.body;

  if (!text || text.length > 1000) {
    return next(new ApiError('Text is required and must be under 1000 characters', 400, 'Invalid input for TTS'));
  }

  const audioContent = await synthesizeSpeech(text);

  ApiAudioResponse(res, audioContent);
}
