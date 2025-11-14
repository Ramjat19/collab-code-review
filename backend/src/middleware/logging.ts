import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * HTTP Request/Response Logging Middleware
 * Logs incoming requests and their responses with timing information
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log the incoming request
  const requestInfo = {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id, // If user is authenticated
  };

  logger.http('Incoming request', requestInfo);

  // Capture the original end function
  const originalEnd = res.end;

  // Override res.end to log response
  res.end = function(chunk?: any, encoding?: any, callback?: any): any {
    const duration = Date.now() - startTime;
    
    const responseInfo = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userId: (req as any).user?.id,
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Request failed', responseInfo);
    } else if (res.statusCode >= 400) {
      logger.warn('Client error', responseInfo);
    } else {
      logger.http('Request completed', responseInfo);
    }

    // Call the original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};

/**
 * Error Logging Middleware
 * Logs errors with full context and stack traces
 */
export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  const errorInfo = {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id,
    body: req.body,
    params: req.params,
    query: req.query,
    statusCode: err.statusCode || 500,
  };

  // Log error with appropriate level
  if (err.statusCode && err.statusCode < 500) {
    logger.warn('Client error occurred', errorInfo);
  } else {
    logger.error('Server error occurred', errorInfo);
  }

  // Pass error to next error handler
  next(err);
};

/**
 * Route Not Found Logger
 * Logs 404 errors for non-existent routes
 */
export const notFoundLogger = (req: Request, res: Response, next: NextFunction) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  });
  
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
};

/**
 * Performance Monitoring Middleware
 * Logs slow requests (> threshold)
 */
export const performanceLogger = (threshold: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (duration > threshold) {
        logger.warn('Slow request detected', {
          method: req.method,
          url: req.url,
          duration: `${duration}ms`,
          threshold: `${threshold}ms`,
          statusCode: res.statusCode,
          userId: (req as any).user?.id,
        });
      }
    });

    next();
  };
};
