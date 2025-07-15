import mongoose, { Types } from 'mongoose';
/**
 * Generates a random 5-digit number and converts it to a string.
 * @returns A 5-digit OTP as a string.
 */
export const generateOTP = () => Math.floor(10000 + Math.random() * 90000).toString();
/**
 * Recursively searches an object for a given key and returns the values of all matches.
 *
 * @param input - The object or array of objects to search.
 * @param key - The key to search for.
 * @returns An array of values for the given key, or an empty array if no matches are found.
 */
export const findKeyValues = (input, key) => {
    const results = [];
    const search = (obj) => {
        if (Array.isArray(obj)) {
            obj.forEach(search);
        }
        else if (obj && typeof obj === 'object') {
            for (const [k, v] of Object.entries(obj)) {
                if (k === key) {
                    Array.isArray(v) ? results.push(...v) : results.push(v);
                }
                if (typeof v === 'object' && v !== null) {
                    search(v);
                }
            }
        }
    };
    search(input);
    return results;
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
/**
 * Generates all possible IP addresses in the same subnet for a given IP address.
 * Assumes a standard subnet mask of 255.255.255.0 (CIDR /24), which means it
 * generates IPs from x.x.x.1 to x.x.x.254 for the provided base IP address x.x.x.
 *
 * @param ipAddress - The base IP address to generate subnet IPs for.
 * @returns An array of IP addresses within the same subnet as the provided IP address.
 */
export const getSubnetIPs = (ipAddress) => {
    const parts = ipAddress.split('.');
    if (parts.length !== 4)
        return [ipAddress];
    const base = `${parts[0]}.${parts[1]}.${parts[2]}`;
    const ips = [];
    // Loop through 1 to 254 to avoid network and broadcast addresses
    for (let i = 1; i < 255; i++) {
        ips.push(`${base}.${i}`);
    }
    return ips;
};
