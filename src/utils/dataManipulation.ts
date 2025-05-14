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
