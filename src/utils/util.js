const { default: mongoose } = require("mongoose");

exports.generateOTP = () => {
  // Generate a random 5-digit number
  const otp = Math.floor(10000 + Math.random() * 90000);
  // Generate a random number between 10000 and 99999
  return otp.toString(); // Convert the number to a string
};

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

exports.stringToObjectID = (data) => {
  try {
    if (Array.isArray(data)) {
      return data.map(id => mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id);
    } else {
      return mongoose.isValidObjectId(data) ? new mongoose.Types.ObjectId(data) : data;
    }
  } catch (error) {
    throw new Error('Invalid Object ID format');
  }
};
