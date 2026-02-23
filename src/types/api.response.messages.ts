import { DeepFlatten } from '#src/utils/DeepFlatternTypes.js';
import { responseMessages } from '@vin51435/studenhub-contracts';
export type IResponseMessage = DeepFlatten<typeof responseMessages>;
