import { Request, Response } from 'express';
import { authService } from './auth.service';
import { SignUpInput } from './auth.schema';

export const authController = {
  async signUp(req: Request, res: Response): Promise<void> {
    const body = req.body as SignUpInput;
    const user = await authService.signUp(body);

    res.status(201).json({ success: true, data: user });
  },
};
