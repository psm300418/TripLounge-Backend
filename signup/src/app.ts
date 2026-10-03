import express from 'express';
import { errorMiddleware } from './middlewares/error.middleware';
import { notFoundMiddleware } from './middlewares/notFound.middleware';
import authRouter from './modules/auth/auth.route';

const app = express();

app.use(express.json());

app.use('/auth', authRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
