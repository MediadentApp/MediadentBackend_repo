const requestInfo = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const requestTime = new Date().toISOString();
    req.requestTime = requestTime;
    next();
};
export default requestInfo;
