import { IApiResponse } from '#src/types/api.response.js';
import { Request } from 'express-serve-static-core';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

export type AppRequest<Params = ParamsDictionary, ReqBody = any, Query = ParsedQs> = Request<
  Params,
  IApiResponse,
  ReqBody,
  Query
>;

export type AppRequestBody<ReqBody = any, ReqParams extends ParamsDictionary = ParamsDictionary> = AppRequest<
  ReqParams,
  ReqBody,
  ParsedQs
>;

export type AppRequestQuery<ReqQuery = ParsedQs> = AppRequest<ParamsDictionary, {}, ReqQuery>;

export type AppRequestParams<
  ReqParams extends ParamsDictionary = ParamsDictionary,
  ReqQuery extends ParsedQs = ParsedQs,
> = AppRequest<ReqParams, {}, ReqQuery>;
