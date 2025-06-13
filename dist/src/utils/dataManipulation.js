/**
 * Creates an object with only the key-value pairs from `body` that correspond to one of the given `fields`.
 * Useful for creating a MongoDB update object.
 *
 * @param fields An array of strings, each representing a field name.
 * @param body An object containing the data to be filtered.
 * @returns An object with only the key-value pairs from `body` that correspond to one of the given `fields`.
 */
export const getUpdateObj = (fields, body) => {
    const updateObj = {};
    fields.forEach(field => {
        if (body[field] !== undefined)
            updateObj[field] = body[field];
    });
    return updateObj;
};
/**
 * Flattens a nested object into a single-level object with dot-separated keys.
 *
 * @param obj The object to flatten.
 * @param prefix A string to prefix to each key, used for recursion.
 * @param res An object to accumulate the flattened key-value pairs, used for recursion.
 * @returns A single-level object with dot-separated keys representing the hierarchy of the original object.
 */
export function flattenObj(obj, prefix = '', res = {}) {
    for (const key in obj) {
        const val = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            flattenObj(val, newKey, res);
        }
        else {
            res[newKey] = val;
        }
    }
    return res;
}
