import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';

// Create CSRF protection middleware
// Uses cookies to store the secret (requires cookie-parser)
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none' as 'none', // Important for cross-origin
    path: '/'
  }
});

// Error handler for CSRF failures
export const csrfErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err.code === 'EBADCSRFTOKEN') {
    // Log security event
    console.error('[CSRF] Invalid CSRF token detected', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'Request rejected due to invalid security token'
    });
  }
  next(err);
};