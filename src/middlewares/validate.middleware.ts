import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { AppError } from '../utils/appError';

export const validate =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues[0]?.message ?? '잘못된 요청입니다.';
        next(new AppError(400, 'INVALID_REQUEST', message));
        return;
      }
      next(error);
    }
  };
