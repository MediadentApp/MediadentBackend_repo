import { ErrorCodes } from '#src/config/errorCodes.js';

export type ErrorCodeType = {
  [K in keyof typeof ErrorCodes]: (typeof ErrorCodes)[K][keyof (typeof ErrorCodes)[K]];
}[keyof typeof ErrorCodes];
