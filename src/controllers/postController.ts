import responseMessages from '#src/config/constants/responseMessages.js';
import { uploadToS3 } from '#src/libs/s3.js';
import { AppRequestBody } from '#src/types/api.request.js';
import { AppResponse } from '#src/types/api.response.js';
import { PostBody } from '#src/types/request.post.js';
import ApiResponse from '#src/utils/ApiResponse.js';
import catchAsync from '#src/utils/catchAsync.js';
import axios from 'axios';
import { NextFunction } from 'express';

export const posts = catchAsync(async (req: AppRequestBody<PostBody>, res: AppResponse, next: NextFunction) => {
  console.log('posts', req.body);
  console.log('req.files', req.files);
  console.log('Request Content-Type:', req.headers['content-type']);
  console.log('Files received:', req.files?.length);

  const files = req.files as Array<Express.Multer.File>;

  if (!files || files.length === 0) {
    return ApiResponse(res, 400, 'no images');
  }

  const s3UploadUrl = process.env.AWS_IMAGE_UPLOAD_LAMBDA;
  if (!s3UploadUrl) {
    console.error('AWS_IMAGE_UPLOAD_LAMBDA is not defined');
    return ApiResponse(res, 500, responseMessages.GENERAL.SERVER_ERROR);
  }

  const convertedFiles = files.map(file => ({
    fileBase64: file.buffer.toString('base64'),
    fileName: file.originalname,
    mimeType: file.mimetype,
    // Optional config per file
    config: {
      format: 'jpeg',
      quality: 70,
    },
  }));

  const response = await axios.post(s3UploadUrl, {
    username: req.user.username,
    files: convertedFiles,
  });

  ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, response.data);
});
