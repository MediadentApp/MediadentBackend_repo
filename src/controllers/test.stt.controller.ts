import { speechToText } from '#src/services/test.stt.service.js';
import { AppRequest } from '#src/types/api.request.js';
import { AppResponse } from '#src/types/api.response.js';
import ApiError from '#src/utils/ApiError.js';
import ApiResponse from '#src/utils/ApiResponse.js';
import { NextFunction } from 'express';

export async function sttHandler(req: AppRequest, res: AppResponse, next: NextFunction) {
  if (!req.file) {
    return next(new ApiError('Audio file is required', 400, 'AUDIO_FILE_MISSING'));
  }

  const transcript = await speechToText(req.file.buffer, req.file.mimetype);

  if (!transcript) {
    return next(new ApiError('Could not transcribe audio', 422, 'STT_FAILED'));
  }

  ApiResponse(res, 200, 'Transcription successful', { transcript });
}
