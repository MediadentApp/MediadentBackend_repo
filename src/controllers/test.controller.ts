import { NextFunction, Request } from 'express';
import { AppRequest } from '#src/types/api.request.js';
import { AppResponse } from '#src/types/api.response.js';
import ApiError from '#src/utils/ApiError.js';
import catchAsync from '#src/utils/catchAsync.js';
import ApiResponse from '#src/utils/ApiResponse.js';
import { generateInterviewQuestionsGemini } from '#src/services/test.gemini.service.js';
import { publishEvent } from '#src/messaging/publisher.js';

export const generateInterviewQuestions = catchAsync(async (req: AppRequest, res: AppResponse, next: NextFunction) => {
  const { type, topic, difficulty, count = 5 } = req.body;

  if (!type || !topic || !difficulty) {
    return next(
      new ApiError('Missing required parameters', 400, 'Missing required parameters: type, topic, difficulty')
    );
  }

  //   const questions = await generateQuestionsWithVertex({
  const questions = await generateInterviewQuestionsGemini({
    type,
    topic,
    difficulty,
    count,
  });

  return ApiResponse(res, 200, 'Interview questions generated successfully', { questions });
});

export const triggerJob = catchAsync(async (req: Request, res: AppResponse, _next: NextFunction) => {
  const jobData = req.body; // Your data
  // await interviewQueue.add('test-job', jobData);

  publishEvent('interview.event', 'interview.test', jobData);

  return ApiResponse(res, 200, 'Job triggered successfully');
});
