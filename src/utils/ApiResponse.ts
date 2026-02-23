import { IApiResponse, IResponseData, IResponseExtra } from '#src/types/api.response.js';
import { IResponseMessage } from '#src/types/api.response.messages.js';
import { AppPaginatedResponse, IPaginatedResponse } from '#src/types/api.response.paginated.js';
import { responseMessages } from '@vin51435/studenhub-contracts';
import { Response } from 'express';

/**
 * Returns a JSON response with the given status code, message, and data.
 *
 * @param {Response} res - The Express.js response object.
 * @param {number} [statusCode=200] - The HTTP status code.
 * @param {IResponseMessage} [message] - The response message. Defaults to the appropriate message
 *   from the responseMessages object.
 * @param {IResponseData} [data] - The response data.
 * @param {IResponseExtra} [extra] - Additional fields to include in the response.
 *
 * @returns {Response<IApiResponse<IResponseData>>} - The response with the given status code, message,
 *   and data.
 */
export default function ApiResponse<ResponseDataType = any, ExtraDataType extends IResponseExtra = IResponseExtra>(
  res: Response,
  statusCode: number = 200,
  message: IResponseMessage | string | null = null,
  data: IResponseData<ResponseDataType> | null = null,
  extra: ExtraDataType = {} as ExtraDataType
): Response<IApiResponse<IResponseData<ResponseDataType>>> {
  const statusMap: { [key: number]: string } = {
    1: 'info',
    2: 'success',
    206: 'partial',
    3: 'redirect',
    4: 'fail',
    5: 'server_error',
  };
  const status = statusCode in statusMap ? statusMap[statusCode] : (statusMap[Math.floor(statusCode / 100)] ?? 'info');
  message = message ?? responseMessages.GENERAL.SUCCESS;

  return res.status(statusCode).json({
    status,
    message,
    ...(data && { data }),
    ...extra,
  });
}

/**
 * Helper function to return a paginated response
 * @param res The express response object
 * @param data The paginated data to be returned
 * @returns The response object with the paginated data
 */
export function ApiPaginatedResponse<T = any>(
  res: Response<IPaginatedResponse<T>>,
  data: IPaginatedResponse<T>
): AppPaginatedResponse<T> {
  return res.status(200).json(data);
}

/**
 * Returns an audio response with the given content.
 *
 * @param {Response} res - The Express.js response object.
 * @param {Uint8Array | Buffer | string | null} [audioContent] - The audio content to be sent.
 *   If not provided, returns a 500 error with a message indicating that the audio content was not found.
 *
 * @returns {Response} - The response with the audio content.
 */
export function ApiAudioResponse(res: Response, audioContent?: Uint8Array | Buffer | string | null) {
  if (!audioContent) {
    return ApiResponse(res, 500, 'Failed to get audio content', null);
  }

  res.set({
    'Content-Type': 'audio/mpeg',
    'Content-Length': audioContent.length,
  });

  res.send(audioContent);
}
