import responseMessages from '#src/config/constants/responseMessages.js';
import { AppResponse } from '#src/types/api.request.js';
import { IPaginatedResponse, IPaginationOptions } from '#src/types/api.response.paginated.js';
import { ApiPaginatedResponse } from '#src/utils/ApiResponse.js';
import { Document, Model } from 'mongoose';

export async function paginate<T extends Document>(
  res: AppResponse,
  model: Model<T>,
  { page = 1, pageSize = 10, filter = {}, sort = {}, projection = {} }: IPaginationOptions
): Promise<AppResponse<IPaginatedResponse<T>>> {
  const totalItems = await model.countDocuments(filter);
  const totalPages = Math.ceil(totalItems / pageSize);
  const skip = (page - 1) * pageSize;

  const data = await model.find(filter, projection).sort(sort).skip(skip).limit(pageSize);

  const returnData: IPaginatedResponse<T> = {
    status: 'success',
    message: responseMessages.GENERAL.SUCCESS,
    data,
    totalItems,
    totalPages,
    currentPage: page,
    pageSize,
  };

  return ApiPaginatedResponse(res, returnData);
}
