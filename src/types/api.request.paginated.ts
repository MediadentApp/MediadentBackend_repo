import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { IPaginatedResponse } from '#src/types/api.response.paginated.js';

export type AppPaginatedRequest<
  ReqQuery extends ParsedQs = ParsedQs,
  Params = ParamsDictionary,
  ReqBody = any
> = Request<Params, IPaginatedResponse, ReqBody, ReqQuery>;
