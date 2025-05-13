import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { IPaginatedResponse, IPaginationOptions } from '#src/types/api.response.paginated.js';
import { SlugParam } from '#src/types/param.js';

/**
 * Interface for an Express.js request with pagination
 * @typedef {import('express').Request<Params, IPaginatedResponse, ReqBody, ReqQuery>} AppPaginatedRequest
 * @template {SlugParam | import('express-serve-static-core').ParamsDictionary} Params
 * @template {IPaginationOptions} ReqQuery
 * @template {any} ReqBody
 */
export type AppPaginatedRequest<
  Params extends SlugParam | ParamsDictionary = SlugParam,
  ReqQuery extends ParsedQs = IPaginationOptions,
  ReqBody = any
> = Request<Params, IPaginatedResponse, ReqBody, ReqQuery>;
