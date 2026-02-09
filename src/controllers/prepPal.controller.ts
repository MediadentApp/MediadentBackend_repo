import { AppRequest } from '#src/types/api.request.js';
import { AppResponse } from '#src/types/api.response.js';
import catchAsync from '#src/utils/catchAsync.js';
import { NextFunction } from 'express';

export const dashboard = catchAsync(async (req: AppRequest, res: AppResponse, next: NextFunction) => {});
