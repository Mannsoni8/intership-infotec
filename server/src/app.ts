import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getEnv } from './config/env';
import { authRoutes } from './routes/auth';
import { documentRoutes, AppHooks } from './routes/documents';

export interface AppOptions {
  authLimit?: number; // register / login tries per 15 minutes per ip
  globalLimit?: number; // all api calls per 15 minutes per ip
}

interface HttpError extends Error {
  type?: string;
  status?: number;
}

export function createApp(hooks: AppHooks = {}, options: AppOptions = {}): Express {
  const app = express();

  app.use(helmet()); // security headers (nosniff, frameguard, hsts ...)
  app.use(cors({ origin: getEnv().clientOrigins, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));
  app.use(express.json({ limit: '300kb' })); // big bodies are rejected

  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: options.globalLimit ?? 1000,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { message: 'Too many requests, please slow down' },
    })
  );

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes(options.authLimit ?? 20));
  app.use('/api/documents', documentRoutes(hooks));

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ message: 'Not found' });
  });

  // error handler - all the next(err) calls end up here.
  // details of unexpected errors are only written to the log, never sent to the user
  app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.too.large') {
      res.status(413).json({ message: 'Request is too large' });
    } else if (err.type === 'entity.parse.failed') {
      res.status(400).json({ message: 'Invalid JSON' });
    } else if (err.name === 'ValidationError' || err.name === 'DocumentValidationError') {
      res.status(400).json({ message: err.message });
    } else {
      console.error(err);
      res.status(500).json({ message: 'Something went wrong on the server' });
    }
  });

  return app;
}
