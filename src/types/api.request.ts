import { IApiResponse, IResponseData } from '#src/types/api.response.js';
import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

export type AppRequest<Params = ParamsDictionary, ReqBody = any, Query = ParsedQs> = Request<
  Params,
  IApiResponse,
  ReqBody,
  Query
>;

export type AppRequestBody<ReqBody = any> = AppRequest<ParamsDictionary, ReqBody, ParsedQs>;

export type AppRequestQuery<ReqQuery extends ParsedQs = ParsedQs> = AppRequest<ParamsDictionary, {}, ReqQuery>;
