import geoip from 'geoip-lite';
import mongoose from 'mongoose';
import { UAParser } from 'ua-parser-js';
import appConfig from '../config/appConfig.js';
import ApiAccessLogsService from '../services/apiAccessLogs.service.js';
const accessCache = new Map(); // key = ip|os|browser, value = timestamp in ms
const cacheDuration = 2 * 60 * 1000; // 2 minutes
// Every 10 minutes, clean old entries
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of accessCache) {
        if (now - timestamp > cacheDuration) {
            accessCache.delete(key);
        }
    }
}, 15 * 60 * 1000);
const logApiAccess = (req, res, next) => {
    if (appConfig.skipRoutes.includes(req.path))
        return next();
    (async () => {
        try {
            const ip = req.ip || req.socket.remoteAddress || '';
            if (appConfig.allowedIps.includes(ip) || appConfig.allowedIps.includes(ip.split('.').slice(0, 3).join('.'))) {
                return;
            }
            const path = req.path.replace(/\/[^/]+/, '');
            const geo = geoip.lookup(ip) || null;
            const parser = new UAParser(req.headers['user-agent']);
            const uaResult = parser.getResult();
            const device = {
                os: uaResult.os.name || 'Unknown OS',
                browser: uaResult.browser.name || 'Unknown Browser',
                platform: uaResult.device?.type || 'desktop',
            };
            const userId = req?.user?._id;
            const username = req?.user?.username;
            const cacheKey = ip;
            const now = Date.now();
            // const lastLogged = accessCache.get(cacheKey);
            // If logged within the last 1 hour, skip DB
            // if (lastLogged && now - lastLogged < cacheDuration) {
            //   return;
            // }
            // Otherwise, insert into DB and update cache
            // accessCache.set(cacheKey, now);
            const timeWindow = new Date();
            timeWindow.setMinutes(0, 0, 0); // hourly grouping
            ApiAccessLogsService.add({
                collectionName: 'SaveApiAccessLog',
                type: 'create',
                id: `${ip}-${path}`,
                data: {
                    ip,
                    path: path,
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
                },
            });
        }
        catch (err) {
            console.error('Async API access log error:', err);
        }
    })();
    next();
};
export default logApiAccess;
