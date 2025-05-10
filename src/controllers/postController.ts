import { ErrorCodes } from "#src/config/constants/errorCodes.js";
import responseMessages from "#src/config/constants/responseMessages.js";
import ImageUpload, { ImageFileData } from "#src/libs/imageUpload.js";
import Post from "#src/models/postModel.js";
import { AppRequestBody } from "#src/types/api.request.js";
import { AppResponse } from "#src/types/api.response.js";
import { PostAuthorType } from "#src/types/enum.js";
import { PostBody } from "#src/types/request.post.js";
import ApiError from "#src/utils/ApiError.js";
import ApiResponse from "#src/utils/ApiResponse.js";
import catchAsync from "#src/utils/catchAsync.js";
import { NextFunction } from "express";

export const posts = catchAsync(async (req: AppRequestBody<PostBody>, res: AppResponse, next: NextFunction) => {
    const { title, content, tags } = req.body
    console.log('posts', req.body)
    console.log('user', req.user)

    if (!title) {
        return next(new ApiError(responseMessages.APP.POST.TITLE_REQUIRED, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT))
    }

    const files = req.files as Array<Express.Multer.File>

    let imageUploadResp
    if (files && files.length) {
        const filesData: ImageFileData[] = files.map(file => ({
            filename: file.originalname,
            mimeType: file.mimetype,
            fileBase64: file.buffer.toString('base64'),
        }))

        imageUploadResp = await ImageUpload({ files: filesData, username: req.user.username ?? 'auto' })
        console.log('imageUploadResp', imageUploadResp)
    }

    const allTags = [...tags, '#' + req.user.fullName]
    const slug = title.replace(/\s+/g, '-').toLowerCase()
    const authorType = PostAuthorType.Personal
    const author = req.user._id

    const data = await Post.create({
        title,
        content,
        slug,
        authorType,
        author,
        tags: allTags,
        mediaUrls: imageUploadResp?.uploaded.map(({ url }) => url)
    })

    ApiResponse(res, 201, responseMessages.GENERAL.SUCCESS, data);
})