import ApiError from '#src/utils/ApiError.js';
import { ErrorCodes } from '@vin51435/studenhub-contracts';
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

interface ValidationSchemas {
  body?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
}

export const validate =
  (schemas: ValidationSchemas) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    const options: Joi.ValidationOptions = {
      abortEarly: false,
      stripUnknown: true,
    };

    if (schemas.body) {
      const { error, value } = schemas.body.validate(req.body, options);
      if (error) {
        errors.push(...error.details.map(d => `body: ${d.message}`));
      } else {
        req.body = value;
      }
    }

    if (schemas.params) {
      const { error, value } = schemas.params.validate(req.params, options);
      if (error) {
        errors.push(...error.details.map(d => `params: ${d.message}`));
      } else {
        req.params = value;
      }
    }

    if (schemas.query) {
      const { error, value } = schemas.query.validate(req.query, options);
      if (error) {
        errors.push(...error.details.map(d => `query: ${d.message}`));
      } else {
        req.query = value as Record<string, string>;
      }
    }

    if (errors.length > 0) {
      throw ApiError.badRequest('Validation failed', ErrorCodes.VALIDATION.FAIL, { ...errors });
    }

    next();
  };
