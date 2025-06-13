import appConfig from '../config/appConfig.js';
import { ErrorCodes } from '../config/constants/errorCodes.js';
import responseMessages from '../config/constants/responseMessages.js';
import ApiError from '../utils/ApiError.js';
import multer from 'multer';
import path from 'path';
// Allowed file types
const allowedTypes = appConfig.app.post.allowedPostsImageType;
const postFileFilter = (req, file, cb) => {
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
