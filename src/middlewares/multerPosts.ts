import appConfig from "#src/config/appConfig.js";
import { ErrorCodes } from "#src/config/constants/errorCodes.js";
import responseMessages from "#src/config/constants/responseMessages.js";
import ApiError from "#src/utils/ApiError.js";
import { Request } from "express";
import multer from "multer";
import path from "path";

// Allowed file types
const allowedTypes = appConfig.app.post.allowedPostsImageType

const fileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
    console.log('file', file)
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
        return cb(null, true);
    }
    cb(new ApiError(responseMessages.DATA.INVALID_IMAGE, 400, ErrorCodes.DATA.POST_IMAGE_TYPE_INVALID))
};

// Multer route
const upload = multer({
    storage: multer.diskStorage({}),
    limits: {
        fileSize: appConfig.app.post.postsMaxImageSize
    },
    fileFilter
})

const postUpload = upload.array('mediaUrls', appConfig.app.post.allowedPostImagesPerPost)
export default postUpload