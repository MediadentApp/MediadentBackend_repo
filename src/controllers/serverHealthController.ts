import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import { IResponseMessage } from '#src/types/api.response.messages.js';
import ApiError from '#src/utils/ApiError.js';
import catchAsync from '#src/utils/catchAsync.js';
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import os from 'os';

export const unknownRoute = (req: Request, res: Response, next: NextFunction) => {
  next(
    new ApiError(
      `Can't find ${req.originalUrl} on this server!` as IResponseMessage,
      404,
      ErrorCodes.SERVER.ROUTE_NOT_FOUND
    )
  );
};

export const health = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const dbStatus: string = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const loadAvg: number[] = os.loadavg();
  const memoryUsage: NodeJS.MemoryUsage = process.memoryUsage();

  return res.status(200).json({
    status: 'success',
    dbConnection: dbStatus,
    timestamp: Date.now(),
    uptime: process.uptime(),
    loadAvg,
    memoryUsage,
  });
});
