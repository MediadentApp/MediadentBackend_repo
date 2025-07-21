import { ErrorCodes } from '../config/constants/errorCodes.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import mongoose from 'mongoose';
import os from 'os';
export const unknownRoute = (req, res, next) => {
    next(new ApiError(`Can't find ${req.originalUrl} on this server!`, 404, ErrorCodes.SERVER.ROUTE_NOT_FOUND));
};
export const health = catchAsync(async (req, res, next) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const loadAvg = os.loadavg();
    const memoryUsage = process.memoryUsage();
    return res.status(200).json({
        status: 'success',
        dbConnection: dbStatus,
        timestamp: Date.now(),
        uptime: process.uptime(),
        loadAvg,
        memoryUsage,
    });
});
export const ping = catchAsync(async (req, res, next) => {
    return res.status(200).json({
        status: 'success',
        message: `Pong from ${req.params.slug}`,
        timestamp: Date.now(),
    });
});
