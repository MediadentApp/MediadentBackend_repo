import { Request, Response, NextFunction } from 'express';
import geoip from 'geoip-lite';
import mongoose from 'mongoose';
import { ApiAccessLog } from '#src/models/accessLogs.model.js';
import { UAParser } from 'ua-parser-js';

const logApiAccess = (req: Request, res: Response, next: NextFunction) => {
  // Async fire-and-forget
  (async () => {
    try {
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '';

      // Skip logging for truly local IPs
      if (ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('localhost')) {
        return;
      }

      const geo = geoip.lookup(ip) || null;

      const parser = new UAParser(req.headers['user-agent']);
      const uaResult = parser.getResult();

      const device = {
        os: uaResult.os.name || 'Unknown OS',
        browser: uaResult.browser.name || 'Unknown Browser',
        platform: uaResult.device?.type || 'desktop',
      };

      const userId = (req as any)?.user?._id;
      const username = (req as any)?.user?.username;

      const timeWindow = new Date();
      timeWindow.setMinutes(0, 0, 0); // Round to the current hour

      const existing = await ApiAccessLog.findOne({
        ip,
        'device.os': device.os,
        'device.browser': device.browser,
        timeWindow,
      });

      if (!existing) {
        await ApiAccessLog.create({
          ip,
          location: {
            country: geo?.country,
            region: geo?.region,
            city: geo?.city,
            lat: geo?.ll?.[0],
            lon: geo?.ll?.[1],
          },
          device,
          userAgent: req.headers['user-agent'],
          user: userId ? new mongoose.Types.ObjectId(userId) : undefined,
          username: username || undefined,
          timeWindow,
        });
      }
    } catch (err) {
      console.error('Async API access log error:', err);
    }
  })();

  next(); // Continue to the next middleware
};

export default logApiAccess;
