import responseMessages from '#src/config/constants/responseMessages.js';
import { IResponseData, IResponseExtra, IResponseMessage } from '#src/types/response.message.js';
import { Response } from 'express';

export default function ApiResponse<T>(
  res: Response,
  statusCode: number = 200,
  message: IResponseMessage | null = null,
  data: IResponseData<T> | null = null,
  extra: IResponseExtra = {}
) {
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

// export default function ApiResponse<T>(
//   res: Response,
//   statusCode: number = 200,
//   message: IResponseMessage,
//   data: IResponseData<T>,
//   extra: IResponseExtra = {}
// ): Response<IApiResponse<IResponseData<T>>> {
//   return res.status(statusCode).json({
//     status: 'success',
//     message,
//     data,
//     ...extra,
//   });
// }
