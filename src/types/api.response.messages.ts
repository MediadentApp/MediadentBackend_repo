import responseMessages from '#src/config/constants/responseMessages.js';
import { DeepFlatten } from '#src/utils/DeepFlatternTypes.js';
export type IResponseMessage = DeepFlatten<typeof responseMessages>;
