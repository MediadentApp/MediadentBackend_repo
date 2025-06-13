import aws4 from 'aws4';
import axios from 'axios';
import awsConfig from '../config/awsConfig.js';
async function ImageUpload(body) {
    const opts = {
        host: new URL(awsConfig.imageCompressUpload.host).host,
        path: awsConfig.imageCompressUpload.path,
        service: 'execute-api',
        region: awsConfig.region,
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
        },
    };
    aws4.sign(opts, {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
    });
    try {
        const url = `https://${opts.host}${opts.path}`;
        const res = await axios({
            method: opts.method,
            url,
            data: body,
            headers: opts.headers, // This includes the signed Authorization header
        });
        return res.data;
    }
    catch (err) {
        console.error('ImageUpload error:', err?.response?.data || err);
        return null;
        // throw new ApiError(responseMessages.GENERAL.SERVER_ERROR, 500, ErrorCodes.GENERAL.FAIL);
    }
}
export default ImageUpload;
