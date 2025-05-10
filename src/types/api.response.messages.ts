import responseMessages from '#src/config/constants/responseMessages.js';

// This type extracts all the values (deeply) from the object
type DeepFlatten<T> = T extends object
    ? { [K in keyof T]: DeepFlatten<T[K]> }[keyof T]
    : T;

export type IResponseMessage = DeepFlatten<typeof responseMessages>;
