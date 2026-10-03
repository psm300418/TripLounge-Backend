import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { authController } from './auth.controller';
import { signUpSchema } from './auth.schema';

const authRouter = Router();

// 인증이 필요하지 않은 API: Route → Validation → Controller
authRouter.post('/signup', validate(signUpSchema), asyncHandler(authController.signUp));

export default authRouter;
