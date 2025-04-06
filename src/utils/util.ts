import mongoose, { Types } from 'mongoose';

/**
 * Generates a random 5-digit number and converts it to a string.
 * @returns A 5-digit OTP as a string.
 */
export const generateOTP = (): string =>
  Math.floor(10000 + Math.random() * 90000).toString();

/**
 * Recursively searches through an object and its nested structures to find all values
 * associated with a specified key, and returns them in an array.
 *
 * @param obj - The object or array to search through.
 * @param key - The key for which values need to be found.
 * @returns An array containing all values found for the specified key.
 */
export const findKeyValues = (obj: unknown, key: string): unknown[] => {
  const arr: unknown[] = [];

  // !! Fix this eslint error
  const recursiveSearch = (obj: unknown) => {
    if (Array.isArray(obj)) {
      obj.forEach((ele) => {
        if (typeof ele === 'object' && ele !== null) {
          recursiveSearch(ele);
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach((prop) => {
        if (prop === key) {
          const value = obj[prop as keyof typeof obj];
          arr.concat(value);
        }
        if (
          typeof obj[prop as keyof typeof obj] === 'object' &&
          obj[prop as keyof typeof obj] !== null
        ) {
          recursiveSearch(obj[prop as keyof typeof obj]);
        }
      });
    }
  };

  recursiveSearch(obj);
  return arr;
};

/**
 * Removes restricted fields from an update object.
 *
 * @param update - The update object to be sanitized.
 * @param restrictedFields - List of field names that should be removed from the update object.
 * @returns The sanitized update object.
 */
export const sanitizeUpdate = <T extends Record<string, unknown>>(
  update: T,
  restrictedFields: string[],
): T => {
  const updatedUpdate = { ...update };
  restrictedFields.forEach((field) => {
    if (field in updatedUpdate) {
      delete updatedUpdate[field];
    }
  });
  return updatedUpdate;
};

/**
 * Converts a string or an array of strings to a Mongoose ObjectId.
 * If the string is already a valid ObjectId, it is returned as an ObjectId.
 * If an array of strings is passed, it is mapped to an array of ObjectIds.
 *
 * @param data - The string or array of strings to be converted.
 * @returns The converted ObjectId or array of ObjectIds.
 */
export const stringToObjectID = (
  data: string | string[],
): Types.ObjectId | string | Types.ObjectId[] => {
  const convert = (id: string): Types.ObjectId | string =>
    mongoose.isValidObjectId(id) ? new Types.ObjectId(id) : id;

  return Array.isArray(data) ? data.map(convert) : convert(data);
};

/**
 * Converts a Mongoose ObjectId or an array of ObjectIds to their string representations.
 *
 * @param id - The ObjectId or array of ObjectIds to convert.
 * @returns The string representation of the ObjectId or array of ObjectIds.
 */
export const objectIdToString = (
  id: Types.ObjectId | Types.ObjectId[],
): string | string[] => (Array.isArray(id) ? id.map(String) : String(id));
