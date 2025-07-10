import geoip from 'geoip-lite';
import mongoose from 'mongoose';
import { ApiAccessLog } from '../models/accessLogs.model.js';
import { UAParser } from 'ua-parser-js';
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
    if (req.path === '/api/v1/health' || req.path === '/favicon.ico')
        return next();
    (async () => {
        try {
            const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '';
            if (ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('localhost') || ip.includes('103.107.126.37')) {
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
            const userId = req?.user?._id;
            const username = req?.user?.username;
            const cacheKey = ip;
            const now = Date.now();
            const lastLogged = accessCache.get(cacheKey);
            // If logged within the last 1 hour, skip DB
            if (lastLogged && now - lastLogged < cacheDuration) {
                return;
            }
            // Otherwise, insert into DB and update cache
            accessCache.set(cacheKey, now);
            const timeWindow = new Date();
            timeWindow.setMinutes(0, 0, 0); // hourly grouping
            await ApiAccessLog.create({
                ip,
                path: req.path,
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
        catch (err) {
            console.error('Async API access log error:', err);
        }
    })();
    next();
};
export default logApiAccess;
