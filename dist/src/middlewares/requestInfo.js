const requestInfo = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const requestTime = new Date().toISOString();
    if (process.env.NODE_ENV === 'development') {
        // console.log(
        //   `Executing middleware stack for: ${req.path}, Client IP: ${ip}, Time: ${new Intl.DateTimeFormat('en-US', {
        //     timeStyle: 'short',
        //     hour12: true,
        //   }).format(new Date())}`
        // );
    }
    req.requestTime = requestTime;
    next();
};
export default requestInfo;
