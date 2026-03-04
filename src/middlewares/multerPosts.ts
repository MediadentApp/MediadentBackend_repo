import appConfig from '#src/config/appConfig.js';
import { ErrorCodes, responseMessages } from '@vin51435/studenhub-contracts';
import ApiError from '#src/utils/ApiError.js';
import { Request } from 'express';
import multer from 'multer';
import path from 'path';
import type { Express } from 'express';

// Allowed file types
const allowedTypes = appConfig.app.post.allowedPostsImageType;

const postFileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new ApiError(responseMessages.DATA.INVALID_IMAGE, 400, ErrorCodes.DATA.POST_IMAGE_TYPE_INVALID));
};

// Post Upload
const postUploadSet = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: appConfig.app.post.postsMaxImageSize,
  },
  fileFilter: postFileFilter,
});

export const postUpload = postUploadSet.array('files', appConfig.app.post.allowedPostImagesPerPost);

// Community Creation
const communityUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: appConfig.app.post.postsMaxImageSize },
  fileFilter: postFileFilter,
});

export const communityCreationUpload = communityUpload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
]);

// User Profile
const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: appConfig.app.post.postsMaxImageSize },
  fileFilter: postFileFilter,
});
export const profileImageUpload = profileUpload.single('image');

const audioFileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  // Checks if the mimetype starts with "audio/" (e.g., audio/mpeg, audio/wav)
  if (file.mimetype.startsWith('audio/')) {
    return cb(null, true);
  }

  cb(new ApiError('Only audio files (mp3, wav, etc.) are allowed', 400, 'AUDIO_FILE_TYPE_INVALID'));
};

const audioUploadSet = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
  fileFilter: audioFileFilter,
});
export const audioUpload = audioUploadSet.single('audio');
