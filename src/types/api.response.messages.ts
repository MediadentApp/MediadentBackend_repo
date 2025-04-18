import responseMessages from '#src/config/constants/responseMessages.js';

// This type extracts all the values (deeply) from the object
type Flatten<T> = T extends object ? T[keyof T] : never;
export type IResponseMessage = Flatten<Flatten<typeof responseMessages>>;
