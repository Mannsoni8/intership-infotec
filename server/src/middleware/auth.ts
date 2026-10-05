import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const TOKEN_LIFETIME = '8h';

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, getEnv().jwtSecret, { algorithm: 'HS256', expiresIn: TOKEN_LIFETIME });
}

// returns the user id inside the token, or null if the token is not valid.
// the algorithm is fixed to HS256 so nobody can send a token with "alg: none"
export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, getEnv().jwtSecret, { algorithms: ['HS256'] });
    if (typeof payload === 'object' && typeof payload.sub === 'string') {
      return payload.sub;
    }
    return null;
  } catch {
    return null;
  }
}

// express middleware: the request needs "Authorization: Bearer <token>"
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const userId = token ? verifyToken(token) : null;

  if (!userId) {
    res.status(401).json({ message: 'Please log in again' });
    return;
  }
  req.userId = userId;
  next();
}
