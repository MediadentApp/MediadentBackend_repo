import { ErrorCodes } from '#src/config/constants/errorCodes.js';

export type ErrorCodeType = {
  [K in keyof typeof ErrorCodes]: (typeof ErrorCodes)[K][keyof (typeof ErrorCodes)[K]];
}[keyof typeof ErrorCodes];
