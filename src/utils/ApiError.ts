import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import { ErrorCodeType } from '#src/types/api.response.error.js';
import { IResponseMessage } from '#src/types/api.response.messages.js';

/**
 * Custom error class for handling HTTP errors.
 */
export default class ApiError extends Error {
  public statusCode: number;
  public status: 'info' | 'success' | 'redirect' | 'fail' | 'server_error';
  public isOperational: boolean;
  public errorCode?: ErrorCodeType | string | null;
  public redirectUrl?: string | null;
  public data?: unknown;

  constructor(
    message: IResponseMessage | string,
    statusCode: number,
    errorCode: ErrorCodeType | string | null = null,
    redirectUrl: string | null = null,
    data?: unknown
  ) {
    super(message as string);

    this.statusCode = statusCode;
    this.errorCode = errorCode ?? ErrorCodes.GENERAL.FAIL;
    this.status = ApiError.determineStatus(statusCode);
    this.isOperational = true;
    if (redirectUrl) this.redirectUrl = redirectUrl;
    this.data = data;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }

  private static determineStatus(statusCode: number): 'info' | 'success' | 'redirect' | 'fail' | 'server_error' {
    if (statusCode >= 100 && statusCode < 200) return 'info';
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 300 && statusCode < 400) return 'redirect';
    if (statusCode >= 400 && statusCode < 500) return 'fail';
    return 'server_error';
  }

  // ─── Static Factory Methods ───────────────────────────────────────────────

  static badRequest(
    message: IResponseMessage | string = 'Bad Request',
    errorCode: ErrorCodeType | string | null = null,
    data?: unknown
  ): ApiError {
    return new ApiError(message, 400, errorCode, null, data);
  }

  static unauthorized(
    message: IResponseMessage | string = 'Unauthorized',
    errorCode: ErrorCodeType | string | null = null,
    data?: unknown
  ): ApiError {
    return new ApiError(message, 401, errorCode, null, data);
  }

  static forbidden(
    message: IResponseMessage | string = 'Forbidden',
    errorCode: ErrorCodeType | string | null = null,
    data?: unknown
  ): ApiError {
    return new ApiError(message, 403, errorCode, null, data);
  }

  static notFound(
    message: IResponseMessage | string = 'Not Found',
    errorCode: ErrorCodeType | string | null = null,
    data?: unknown
  ): ApiError {
    return new ApiError(message, 404, errorCode, null, data);
  }

  static conflict(
    message: IResponseMessage | string = 'Conflict',
    errorCode: ErrorCodeType | string | null = null,
    data?: unknown
  ): ApiError {
    return new ApiError(message, 409, errorCode, null, data);
  }

  static unprocessable(
    message: IResponseMessage | string = 'Unprocessable Entity',
    errorCode: ErrorCodeType | string | null = null,
    data?: unknown
  ): ApiError {
    return new ApiError(message, 422, errorCode, null, data);
  }

  static tooManyRequests(
    message: IResponseMessage | string = 'Too Many Requests',
    errorCode: ErrorCodeType | string | null = null,
    data?: unknown
  ): ApiError {
    return new ApiError(message, 429, errorCode, null, data);
  }

  static internal(
    message: IResponseMessage | string = 'Internal Server Error',
    errorCode: ErrorCodeType | string | null = null,
    data?: unknown
  ): ApiError {
    return new ApiError(message, 500, errorCode, null, data);
  }

  static serviceUnavailable(
    message: IResponseMessage | string = 'Service Unavailable',
    errorCode: ErrorCodeType | string | null = null,
    data?: unknown
  ): ApiError {
    return new ApiError(message, 503, errorCode, null, data);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Attach extra data fluently: throw ApiError.notFound('User not found').withData({ id }) */
  withData(data: unknown): this {
    this.data = data;
    return this;
  }

  /** Attach a redirect URL fluently */
  withRedirect(url: string): this {
    this.redirectUrl = url;
    return this;
  }

  /** Narrow check — useful in catch blocks */
  static isApiError(err: unknown): err is ApiError {
    return err instanceof ApiError;
  }
}
