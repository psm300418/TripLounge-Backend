import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "./error.middleware.js";

export const validate = (schemas: { body?: ZodType; params?: ZodType; query?: ZodType }): RequestHandler =>
  (req, res, next) => {
    for (const key of ["body", "params", "query"] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) { next(new AppError(400, "INVALID_REQUEST", "요청 형식을 확인해주세요.")); return; }
      // Express 5 req.query is a getter. Parsed input belongs in res.locals.
      res.locals[key] = result.data;
      if (key === "body") req.body = result.data;
    }
    next();
  };
