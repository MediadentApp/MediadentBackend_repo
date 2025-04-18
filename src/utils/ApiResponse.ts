import responseMessages from '#src/config/constants/responseMessages.js';
import { IApiResponse, IResponseData, IResponseExtra } from '#src/types/api.response.js';
import { IResponseMessage } from '#src/types/api.response.messages.js';
import { AppPaginatedResponse, IPaginatedResponse } from '#src/types/api.response.paginated.js';
import { Response } from 'express';

export default function ApiResponse<ResponseDataType = any>(
  res: Response,
  statusCode: number = 200,
  message: IResponseMessage | null = null,
  data: IResponseData<ResponseDataType> | null = null,
  extra: IResponseExtra = {}
): Response<IApiResponse<IResponseData<ResponseDataType>>> {
  const statusMap: { [key: number]: string } = {
    1: 'info',
    2: 'success',
    206: 'partial',
    3: 'redirect',
    4: 'fail',
    5: 'server_error',
  };
  const status = statusCode in statusMap ? statusMap[statusCode] : statusMap[Math.floor(statusCode / 100)] ?? 'info';
  message = message ?? responseMessages.GENERAL.SUCCESS;

  return res.status(statusCode).json({
    status,
    message,
    ...(data && { data }),
    ...extra,
  });
}

export function ApiPaginatedResponse<T = any>(
  res: Response<IPaginatedResponse<T>>,
  data: IPaginatedResponse<T>
): AppPaginatedResponse<T> {
  return res.status(200).json(data);
}
