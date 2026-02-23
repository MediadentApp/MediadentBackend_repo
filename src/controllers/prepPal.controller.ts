import { CreateSessionBody } from '#src/zod/prepPal.joi.js';
import { AppRequest } from '#src/types/api.request.js';
import { AppResponse } from '#src/types/api.response.js';
import ApiResponse from '#src/utils/ApiResponse.js';
import catchAsync from '#src/utils/catchAsync.js';
import { NextFunction } from 'express';

export const canAccessPrepPalSession = catchAsync(async (req: AppRequest, res: AppResponse, next: NextFunction) => {
  // attach session to req
  next();
});

export const dashboard = catchAsync(async (_req: AppRequest, _res: AppResponse, _next: NextFunction) => {});

export const createSession = catchAsync(
  async (req: AppRequest<{}, CreateSessionBody>, res: AppResponse, next: NextFunction) => {
    const userId = req.user._id;
    const body = req.body;

    return ApiResponse(res, 200, 'Session created successfully');
  }
);
