import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/appError';

export const notFoundMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, 'API_NOT_FOUND', '존재하지 않는 API입니다.'));
};
