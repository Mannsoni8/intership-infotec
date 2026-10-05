import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

// express 4 does not catch errors from async functions, this wrapper does
export function wrap(handler: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

// request bodies are untrusted: this makes sure a value is really a string
// (so {"email": {"$gt": ""}} can never reach the database)
export function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

// express gives params as string, but this keeps typescript happy
export function paramString(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}
