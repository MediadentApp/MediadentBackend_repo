// Direct upload to S3

import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import ApiError from '#src/utils/ApiError.js';
import { getS3KeyFromUrl } from '#src/utils/index.js';
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is not set');
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const defaultS3BucketName = process.env.AWS_S3_BUCKET_NAME;

export const uploadToS3 = async (file: Express.Multer.File, bucketName: string = defaultS3BucketName!) => {
  if (!bucketName) {
    console.error('AWS_S3_BUCKET_NAME is not defined');
    throw new ApiError(responseMessages.GENERAL.SERVER_ERROR, 404, ErrorCodes.GENERAL.FAIL);
  }

  const key = `uploads/${Date.now()}-${file.originalname}`;

  const uploadParams: PutObjectCommandInput = {
    Bucket: bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    // ACL: 'public-read'
  };

  try {
    const data = await s3.send(new PutObjectCommand(uploadParams));
    console.log('File uploaded to S3', data);
    return {
      key,
      url: `https://${bucketName}.s3.amazonaws.com/${key}`,
    };
  } catch (error) {
    console.error('Error uploading file to S3', error);
    throw new ApiError(responseMessages.GENERAL.SERVER_ERROR, 404, ErrorCodes.GENERAL.FAIL);
  }
};

/**
 * Deletes multiple images from S3.
 *
 * @param {string[]} keys - Array of S3 image keys
 *
 * @returns {Promise<void>}
 */
export const deleteImagesFromS3 = async (urls: string[], bucketName: string = defaultS3BucketName!) => {
  if (urls.length === 0) return;

  const keys = getS3KeyFromUrl(urls);

  const deleteParams = {
    Bucket: bucketName,
    Delete: {
      Objects: keys.map(key => ({ Key: key })),
      Quiet: false,
    },
  };

  try {
    const command = new DeleteObjectsCommand(deleteParams);
    const result = await s3.send(command);
    console.log('Deleted:', result.Deleted);
    if (result.Errors && result.Errors.length > 0) {
      console.error('Errors:', result.Errors);
    }
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};

export default s3;
