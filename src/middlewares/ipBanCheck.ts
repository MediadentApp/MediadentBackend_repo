import { Request, Response, NextFunction } from 'express';
import redisConnection from '#src/redis.js';
import ApiError from '#src/utils/ApiError.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import { ErrorCodes } from '#src/config/constants/errorCodes.js';

const ipBanCheck = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  const subnet = ip.split('.').slice(0, 3).join('.');

  const [isBanned, isSubnetBanned] = await Promise.all([
    redisConnection.sismember('banned_ips', ip),
    redisConnection.sismember('banned_subnets', subnet),
  ]);

  if (isBanned || isSubnetBanned) {
    return next(new ApiError(responseMessages.GENERAL.SOMETHING_WENT_WRONG, 500, ErrorCodes.SERVER.UNKNOWN_ERROR));
  }

  next();
};

export default ipBanCheck;
