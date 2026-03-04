import ApiError from '#src/utils/ApiError.js';
import { ErrorCodes } from '@vin51435/studenhub-contracts';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

interface ValidationSchemas {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
}

export const validate =
  (schemas: ValidationSchemas) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.push(...result.error.issues.map((i: z.core.$ZodIssue) => `body: ${i.message}`));
      } else {
        req.body = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.push(...result.error.issues.map((i: z.core.$ZodIssue) => `params: ${i.message}`));
      } else {
        req.params = result.data as ParamsDictionary;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.push(...result.error.issues.map((i: z.core.$ZodIssue) => `query: ${i.message}`));
      } else {
        req.query = result.data as ParsedQs;
      }
    }

    if (errors.length > 0) {
      throw ApiError.badRequest('Validation failed', ErrorCodes.VALIDATION.FAIL, { ...errors });
    }

    next();
  };
