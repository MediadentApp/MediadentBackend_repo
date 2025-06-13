import mongoose, { Types } from 'mongoose';
/**
 * Generates a random 5-digit number and converts it to a string.
 * @returns A 5-digit OTP as a string.
 */
export const generateOTP = () => Math.floor(10000 + Math.random() * 90000).toString();
/**
 * Recursively searches through an object and its nested structures to find all values
 * associated with a specified key, and returns them in an array.
 *
 * @param obj - The object or array to search through.
 * @param key - The key for which values need to be found.
 * @returns An array containing all values found for the specified key.
 */
export const findKeyValues = (obj, key) => {
    const arr = [];
    // !! Fix this eslint error
    const recursiveSearch = (obj) => {
        if (Array.isArray(obj)) {
            obj.forEach(ele => {
                if (typeof ele === 'object' && ele !== null) {
                    recursiveSearch(ele);
                }
            });
        }
        else if (typeof obj === 'object' && obj !== null) {
            Object.keys(obj).forEach(prop => {
                if (prop === key) {
                    const value = obj[prop];
                    arr.concat(value);
                }
                if (typeof obj[prop] === 'object' && obj[prop] !== null) {
                    recursiveSearch(obj[prop]);
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
export const sanitizeUpdate = (update, restrictedFields) => {
    const updatedUpdate = { ...update };
    restrictedFields.forEach(field => {
        if (field in updatedUpdate) {
            delete updatedUpdate[field];
        }
    });
    return updatedUpdate;
};
/**
 * Converts a string or an array of strings to a Mongoose ObjectId.
 * If the input is not a valid ObjectId, it is ignored.
 *
 * @param data - The string or array of strings to be converted.
 * @returns The converted ObjectId or an array of ObjectIds.
 */
export const stringToObjectID = (data) => {
    const convert = (id) => mongoose.isValidObjectId(id) ? new Types.ObjectId(id) : null;
    if (Array.isArray(data)) {
        const objectIds = data.map(convert).filter(Boolean);
        return objectIds;
    }
    const objectId = convert(data);
    if (!objectId) {
        throw new Error('Invalid ObjectId provided');
    }
    return objectId;
};
/**
 * Converts a Mongoose ObjectId or an array of ObjectIds to their string representations.
 *
 * @param id - The ObjectId or array of ObjectIds to convert.
 * @returns The string representation of the ObjectId or array of ObjectIds.
 */
export const objectIdToString = (id) => Array.isArray(id) ? id.map(String) : String(id);
export function getS3KeyFromUrl(urlOrUrls) {
    if (Array.isArray(urlOrUrls)) {
        return urlOrUrls.map(url => getS3KeyFromUrl(url));
    }
    const parts = urlOrUrls.split('.amazonaws.com/');
    return parts.length > 1 ? decodeURIComponent(parts[1]) : '';
}
/**
 * Formats a file size in bytes as a human-readable string.
 *
 * @param size - The file size in bytes.
 * @returns A string in the format '<size> bytes', '<size> KB', or '<size> MB'.
 */
export function formatFileSize(size) {
    if (size < 1024) {
        return `${size} bytes`;
    }
    else if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(2)} KB`;
    }
    else {
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }
}
