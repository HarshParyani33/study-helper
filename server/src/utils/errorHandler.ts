import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode = 400, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[Error] ${req.method} ${req.path}:`, err);

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details,
    });
    return;
  }

  // Handle MongoDB duplicate key error
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {});
    res.status(409).json({
      success: false,
      error: `Duplicate entry for: ${fields.join(', ')}`,
      details: err.keyValue,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
}

