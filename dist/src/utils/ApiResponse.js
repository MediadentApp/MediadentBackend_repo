import responseMessages from '../config/constants/responseMessages.js';
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
export default function ApiResponse(res, statusCode = 200, message = null, data = null, extra = {}) {
    const statusMap = {
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
export function ApiPaginatedResponse(res, data) {
    return res.status(200).json(data);
}
