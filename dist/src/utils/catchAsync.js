/**
 * A higher-order function that wraps an async function with a try-catch block.
 * This ensures that any errors are passed to the next middleware in the stack.
 *
 * @param fn - The asynchronous function to wrap
 * @returns A function that handles the request, response, and next middleware function
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};
export default catchAsync;
