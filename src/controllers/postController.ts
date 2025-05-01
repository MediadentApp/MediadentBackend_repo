import responseMessages from "#src/config/constants/responseMessages.js";
import { AppRequestBody } from "#src/types/api.request.js";
import { AppResponse } from "#src/types/api.response.js";
import { EmailRegBody } from "#src/types/request.auth.js";
import ApiResponse from "#src/utils/ApiResponse.js";
import catchAsync from "#src/utils/catchAsync.js";
import { NextFunction } from "express";

export const posts = catchAsync(async (req: AppRequestBody<>, res: AppResponse, next: NextFunction) => {
    console.log('posts', req.body)
    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, req.body);
})