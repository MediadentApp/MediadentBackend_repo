import { ErrorCodes } from '../config/constants/errorCodes.js';
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
    statusCode;
    /**
     * The status type based on HTTP response categories.
     */
    status;
    /**
     * Whether the error is operational or unexpected.
     */
    isOperational;
    /**
     * A unique error code for the error, if applicable.
     * Used to handle different error scenarios.
     */
    errorCode;
    /**
     * Optional URL to redirect the user, if applicable.
     */
    redirectUrl;
    /**
     * Creates an instance of HttpError.
     *
     * @param {IResponseMessage} message - The error message to be sent to the client, of type IResponseMessage.
     * @param {number} statusCode - The HTTP status code.
     * @param {ErrorCodeType} [errorCode] - A unique error code for the error, if applicable.
     * @param {string | null} [redirectUrl] - The URL to redirect to (if applicable).
     */
    constructor(message, statusCode, errorCode = null, redirectUrl = null) {
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
    static determineStatus(statusCode) {
        if (statusCode >= 100 && statusCode < 200)
            return 'info'; // 1xx
        if (statusCode >= 200 && statusCode < 300)
            return 'success'; // 2xx
        if (statusCode >= 300 && statusCode < 400)
            return 'redirect'; // 3xx
        if (statusCode >= 400 && statusCode < 500)
            return 'fail'; // 4xx
        return 'server_error'; // 5xx and anything else
    }
}
