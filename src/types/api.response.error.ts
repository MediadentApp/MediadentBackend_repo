import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import { DeepFlatten } from '#src/utils/DeepFlatternTypes.js';

export type ErrorCodeType = DeepFlatten<typeof ErrorCodes>;

// export type ErrorCodeType = {
//   [K in keyof typeof ErrorCodes]: (typeof ErrorCodes)[K][keyof (typeof ErrorCodes)[K]];
// }[keyof typeof ErrorCodes];
