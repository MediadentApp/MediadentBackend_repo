import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import { ErrorCodeType } from '#src/types/api.response.error.js';
import { IResponseMessage } from '#src/types/api.response.js';

/**
 * Custom error class for handling HTTP errors.
 *
 * @class HttpError
 * @extends {Error}
 */
export default class ApiError extends Error {
  /**
   * The HTTP status code for the error.
   */
  public statusCode: number;

  /**
   * The status type based on HTTP response categories.
   */
  public status: 'info' | 'success' | 'redirect' | 'fail' | 'server_error';

  /**
   * Whether the error is operational or unexpected.
   */
  public isOperational: boolean;

  /**
   * A unique error code for the error, if applicable.
   * Used to handle different error scenarios.
   */
  public errorCode?: ErrorCodeType;

  /**
   * Optional URL to redirect the user, if applicable.
   */
  public redirectUrl?: string | null;

  /**
   * Creates an instance of HttpError.
   *
   * @param {IResponseMessage} message - The error message to be sent to the client.
   * @param {number} statusCode - The HTTP status code.
   * @param {ErrorCodeType} [errorCode] - A unique error code for the error, if applicable.
   * @param {string | null} [redirectUrl] - The URL to redirect to (if applicable).
   */
  constructor(
    message: IResponseMessage,
    statusCode: number,
    errorCode: ErrorCodeType | null = null,
    redirectUrl: string | null = null
  ) {
    super(message);

    this.statusCode = statusCode;
    this.errorCode = errorCode ?? ErrorCodes.GENERAL.FAIL;
    this.status = ApiError.determineStatus(statusCode);
    this.isOperational = true;
    this.redirectUrl = redirectUrl;

    // Capture the stack trace for debugging
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Determines the status type based on the HTTP status code.
   */
  private static determineStatus(statusCode: number): 'info' | 'success' | 'redirect' | 'fail' | 'server_error' {
    if (statusCode >= 100 && statusCode < 200) return 'info'; // 1xx
    if (statusCode >= 200 && statusCode < 300) return 'success'; // 2xx
    if (statusCode >= 300 && statusCode < 400) return 'redirect'; // 3xx
    if (statusCode >= 400 && statusCode < 500) return 'fail'; // 4xx
    return 'server_error'; // 5xx and anything else
  }
}
