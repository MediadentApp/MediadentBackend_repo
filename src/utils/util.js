const { default: mongoose } = require("mongoose");

/**
 * Generates a random 5-digit number and converts it to a string.
 * @returns {string} - A 5-digit string.
 */
exports.generateOTP = () => {
  // Generate a random 5-digit number
  const otp = Math.floor(10000 + Math.random() * 90000);

  // Convert the number to a string
  return otp.toString();
};

/**
 * Recursively searches through an object and its nested structures to find all values
 * associated with a specified key, and returns them in an array.
 * 
 * @param {Object|Array} obj - The object or array to search through.
 * @param {string} key - The key for which values need to be found.
 * @returns {Array} - An array containing all values found for the specified key.
 */
exports.findKeyValues = (obj, key) => {
  let arr = [];

  const recursiveSearch = (obj) => {
    if (Array.isArray(obj)) {
      obj.forEach(ele => {
        if (typeof ele === 'object' && ele !== null) {
          recursiveSearch(ele);
        }
      });
    }
    else if (typeof obj === 'object' && obj !== null) {
      for (let prop in obj) {
        if (prop === key) {
          if (Array.isArray(obj[prop])) {
            arr.push(...(obj[prop]));
          } else {
            arr.push(obj[prop]);
          }
        }
        if (typeof obj[prop] === 'object' && obj[prop] !== null) {
          recursiveSearch(obj[prop]);
        }
      }
    }
  };

  recursiveSearch(obj);
  return arr;
};

/**
 * Removes restricted fields from an update object.
 *
 * @param {Object} update - The update object to be sanitized.
 * @param {Array<string>} restrictedFields - List of field names that should be removed from the update object.
 * @returns {Object} - The sanitized update object.
 */
exports.sanitizeUpdate = (update, restrictedFields) => {
  restrictedFields.forEach(field => {
    if (update[field]) {
      delete update[field];
    }
  });
  return update;
};

/**
 * Converts a string or an array of strings to a Mongoose ObjectId.
 * If the string is already a valid ObjectId, it is returned as is.
 * If the string is not a valid ObjectId, it is returned as is.
 * If an array of strings is passed, it is mapped to an array of ObjectIds.
 *
 * @param {string|Array<string>} data - The string or array of strings to be converted.
 * @returns {mongoose.Types.ObjectId|Array<mongoose.Types.ObjectId>} - The converted ObjectId or array of ObjectIds.
 */
exports.stringToObjectID = (data) => {
  const convert = (id) => mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id;

  return Array.isArray(data) ? data.map(convert) : convert(data);
};

/**
 * Converts a Mongoose ObjectId or an array of ObjectIds to their string representations.
 *
 * @param {mongoose.Types.ObjectId|Array<mongoose.Types.ObjectId>} id - The ObjectId or array of ObjectIds to convert.
 * @returns {string|Array<string>} - The string representation of the ObjectId or array of ObjectIds.
 */
exports.objectIdToString = (id) => (
  Array.isArray(id) ? id.map(String) : String(id)
);
