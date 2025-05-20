// This type extracts all the values (deeply) from the object
export type DeepFlatten<T> = T extends object ? { [K in keyof T]: DeepFlatten<T[K]> }[keyof T] : T;
