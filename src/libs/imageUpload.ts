import aws4 from 'aws4';
import axios from 'axios';
import awsConfig from '#src/config/awsConfig.js';

type ImageUploadConfig = {
  format: string;
  quality: number;
  resize: {
    width: number;
    height: number;
  };
};

export type ImageFileData = {
  fileBase64: string;
  fileName: string;
  mimeType: string;
  config?: ImageUploadConfig;
};

export interface IImageUploadBody {
  username?: string;
  files: ImageFileData[];
}

export interface IImageUploadResponse {
  uploaded: IUploadedImage[];
}

export interface IUploadedImage {
  fileName: string;
  key: string;
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

async function ImageUpload(body: IImageUploadBody): Promise<IImageUploadResponse | null> {
  const opts = {
    host: new URL(awsConfig.imageCompressUpload.host!).host,
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
  } catch (err: any) {
    console.error('ImageUpload error:', err?.response?.data || err);
    return null;
    // throw new ApiError(responseMessages.GENERAL.SERVER_ERROR, 500, ErrorCodes.GENERAL.FAIL);
  }
}

export default ImageUpload;
