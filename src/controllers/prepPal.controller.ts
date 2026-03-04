import { CreateSessionBody } from '#src/zod/prepPal.joi.js';
import { AppRequest } from '#src/types/api.request.js';
import { AppResponse } from '#src/types/api.response.js';
import ApiResponse from '#src/utils/ApiResponse.js';
import catchAsync from '#src/utils/catchAsync.js';
import { NextFunction } from 'express';
import { PrepPalSessionModel } from '#src/models/prepPal/session.model.js';
import { PrepPalSessionDB } from '#src/types/model.js';

export const canAccessPrepPalSession = catchAsync(async (req: AppRequest, res: AppResponse, next: NextFunction) => {
  // attach session to req
  next();
});

export const dashboard = catchAsync(async (_req: AppRequest, _res: AppResponse, _next: NextFunction) => {});

export const createSession = catchAsync(
  async (req: AppRequest<{}, CreateSessionBody>, res: AppResponse, next: NextFunction) => {
    const userId = req.user._id;
    const body = req.body;
    const usage = req.usage?.prepPal;

    const payload: PrepPalSessionDB = {
      user: userId,
      ...body,
      userUsage: usage!._id,
      status: 'in_progress',
      startedAt: new Date(),
      currentQuestionIndex: 0,
    };

    const session = await PrepPalSessionModel.create(payload);

    return ApiResponse(res, 200, 'Session created successfully');
  }
);
