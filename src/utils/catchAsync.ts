import { Request, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

/**
 * A higher-order function that wraps an async function with a try-catch block.
 * This ensures that any errors are passed to the next middleware in the stack.
 *
 * @param fn - The asynchronous function to wrap
 * @returns A function that handles the request, response, and next middleware function
 */
const catchAsync = <
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction
  ) => Promise<void | Response<ResBody>>
) => {
  return (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction
  ) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;
