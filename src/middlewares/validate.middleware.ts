import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { AppError } from "./error.middleware.js";

type RequestSchemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export const validate =
  (schemas: RequestSchemas): RequestHandler =>
  (req, _res, next) => {
    const result = {
      body: schemas.body?.safeParse(req.body),
      params: schemas.params?.safeParse(req.params),
      query: schemas.query?.safeParse(req.query),
    };

    const hasError = Object.values(result).some(
      (validationResult) => validationResult && !validationResult.success,
    );

    if (hasError) {
      next(new AppError(400, "INVALID_REQUEST", "Invalid request."));
      return;
    }

    if (result.body?.success) {
      req.body = result.body.data;
    }
    if (result.params?.success) {
      req.params = result.params.data as typeof req.params;
    }
    if (result.query?.success) {
      req.query = result.query.data as typeof req.query;
    }

    next();
  };
