import responseMessages from "#src/config/constants/responseMessages.js";
import { uploadToS3 } from "#src/libs/s3.js";
import { AppRequestBody } from "#src/types/api.request.js";
import { AppResponse } from "#src/types/api.response.js";
import { PostBody } from "#src/types/request.post.js";
import ApiResponse from "#src/utils/ApiResponse.js";
import catchAsync from "#src/utils/catchAsync.js";
import { NextFunction } from "express";

export const posts = catchAsync(async (req: AppRequestBody<PostBody>, res: AppResponse, next: NextFunction) => {
    console.log('posts', req.body)
    console.log('req.files', req.files)

    const files = req.files as Array<Express.Multer.File>

    let data
    if (files && files.length) {
        const s3Result = await Promise.all(files.map(file => uploadToS3(file)))
        data = {
            files: s3Result
        }
    }

    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
})