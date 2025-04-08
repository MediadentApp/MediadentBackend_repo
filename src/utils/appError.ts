export default class AppError extends Error {
  public statusCode: number;

  public status: 'fail' | 'error';

  public isOperational: boolean;

  public redirectUrl?: string | null;

  constructor(
    message: string,
    statusCode: number,
    redirectUrl: string | null = null
  ) {
    super(message);

    this.statusCode = statusCode;
    this.status = statusCode.toString().startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.redirectUrl = redirectUrl;

    // Capture the stack trace for debugging
    Error.captureStackTrace(this, this.constructor);
  }
}
