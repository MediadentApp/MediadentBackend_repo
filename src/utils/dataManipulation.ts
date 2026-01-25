import { IResponseMessage } from '#src/types/api.response.messages.js';

/**
 * Creates an object with only the key-value pairs from `body` that correspond to one of the given `fields`.
 * Useful for creating a MongoDB update object.
 *
 * @param fields An array of strings, each representing a field name.
 * @param body An object containing the data to be filtered.
 * @returns An object with only the key-value pairs from `body` that correspond to one of the given `fields`.
 */
export const getUpdateObj = (fields: string[], body: any) => {
  const updateObj: any = {};
  fields.forEach(field => {
    if (body[field] !== undefined) updateObj[field] = body[field];
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
export function flattenObj(obj: Record<string, unknown>, prefix = '', res: Record<string, unknown> = {}) {
  for (const key in obj) {
    const val = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      flattenObj(val as Record<string, unknown>, newKey, res);
    } else {
      res[newKey] = val;
    }
  }
  return res;
}

/**
 * Replaces placeholders in the given template with the corresponding values from the variables object.
 * Placeholders are in the format of "{{key}}", where "key" is the key of the value to be replaced in the variables object.
 * If the key is not found in the variables object, the placeholder is replaced with "{{key}}", unchanged.
 * @param template The string template to replace placeholders in, or an object with a "message" property that contains the template.
 * @param variables An object containing key-value pairs of values to replace placeholders with.
 * @returns The template string with all placeholders replaced with their corresponding values from the variables object.
 */
export function formatErrorMessageTemplate(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(variables[key] ?? `{{${key}}}`));
}
