import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import * as Sentry from '@sentry/node';
import { setSentryUser, setSentryContext, addSentryBreadcrumb } from '../config/sentry';
import logger from '../utils/logger';
import { IUser } from '../models/User';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

/**
 * Middleware to attach Sentry request handler
 * This should be the first middleware in the chain
 */
export const sentryRequestHandler = () => {
  return Sentry.setupExpressErrorHandler;
};

/**
 * Middleware to attach Sentry tracing handler
 * This enables performance monitoring for requests
 */
export const sentryTracingHandler = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Sentry will automatically trace requests
    next();
  };
};

/**
 * Middleware to add user context to Sentry
 * Should be placed after authentication middleware
 */
export const sentryUserContext = (req: Request, res: Response, next: NextFunction) => {
  if (req.user) {
    const userId = (req.user._id as any)?.toString() || String(req.user._id);
    
    setSentryUser({
      id: userId,
      email: req.user.email,
      username: req.user.username,
    });

    // Add breadcrumb for authentication
    addSentryBreadcrumb(
      `User authenticated: ${req.user.username}`,
      'auth',
      'info',
      {
        userId,
        username: req.user.username,
      }
    );
  }

  next();
};

/**
 * Middleware to add request context to Sentry
 */
export const sentryRequestContext = (req: Request, res: Response, next: NextFunction) => {
  // Add request metadata
  setSentryContext('request', {
    method: req.method,
    url: req.url,
    path: req.path,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Add custom tags
  Sentry.setTag('http.method', req.method);
  Sentry.setTag('http.path', req.path);

  // Add breadcrumb for the request
  addSentryBreadcrumb(
    `${req.method} ${req.path}`,
    'http',
    'info',
    {
      url: req.url,
      query: req.query,
      params: req.params,
    }
  );

  next();
};

/**
 * Middleware to capture database operations
 */
export const sentryDatabaseContext = (operation: string, details: Record<string, any>) => {
  addSentryBreadcrumb(
    `Database: ${operation}`,
    'database',
    'info',
    details
  );

  setSentryContext('database', {
    operation,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Middleware to capture external API calls
 */
export const sentryApiCallContext = (
  service: string,
  endpoint: string,
  method: string,
  details?: Record<string, any>
) => {
  addSentryBreadcrumb(
    `API Call: ${method} ${service}${endpoint}`,
    'http.external',
    'info',
    {
      service,
      endpoint,
      method,
      ...details,
    }
  );
};

/**
 * Sentry error handler middleware
 * This should be placed after all routes but before custom error handlers
 */
export const sentryErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Add error context
  Sentry.withScope((scope) => {
    // Add request information
    scope.setContext('request', {
      method: req.method,
      url: req.url,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '[REDACTED]' : undefined,
        cookie: req.headers.cookie ? '[REDACTED]' : undefined,
      },
      body: req.body,
      params: req.params,
      query: req.query,
    });

    // Add user information if available
    if (req.user) {
      const userId = (req.user._id as any)?.toString() || String(req.user._id);
      
      scope.setUser({
        id: userId,
        email: req.user.email,
        username: req.user.username,
      });
    }

    // Add error details
    scope.setContext('error', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode: (err as any).statusCode,
    });

    // Set error level based on status code
    if ((err as any).statusCode) {
      const statusCode = (err as any).statusCode;
      if (statusCode >= 500) {
        scope.setLevel('error');
      } else if (statusCode >= 400) {
        scope.setLevel('warning');
      } else {
        scope.setLevel('info');
      }
    } else {
      scope.setLevel('error');
    }

    // Set tags
    scope.setTag('error.type', err.name);
    if ((err as any).statusCode) {
      scope.setTag('http.status_code', (err as any).statusCode.toString());
    }

    // Capture the exception
    Sentry.captureException(err);
  });

  // Log to Winston as well
  logger.error('Error captured by Sentry', {
    error: err.message,
    stack: err.stack,
    statusCode: (err as any).statusCode,
    url: req.url,
    method: req.method,
  });

  // Pass to next error handler
  next(err);
};

/**
 * Middleware to track slow requests
 */
export const sentryPerformanceMonitoring = (thresholdMs: number = 3000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Capture response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;

      if (duration > thresholdMs) {
        addSentryBreadcrumb(
          `Slow request: ${req.method} ${req.path}`,
          'performance',
          'warning',
          {
            duration: `${duration}ms`,
            threshold: `${thresholdMs}ms`,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          }
        );

        // Capture as a performance issue
        Sentry.withScope((scope) => {
          scope.setContext('performance', {
            duration,
            threshold: thresholdMs,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          });
          scope.setTag('performance.slow_request', 'true');
          scope.setLevel('warning');

          Sentry.captureMessage(
            `Slow request detected: ${req.method} ${req.path} took ${duration}ms`,
            'warning'
          );
        });
      }
    });

    next();
  };
};

/**
 * Helper function to manually capture errors with context
 */
export const captureErrorWithContext = (
  error: Error,
  context: {
    userId?: string;
    action?: string;
    resource?: string;
    metadata?: Record<string, any>;
  }
) => {
  Sentry.withScope((scope) => {
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }

    if (context.action) {
      scope.setTag('action', context.action);
    }

    if (context.resource) {
      scope.setTag('resource', context.resource);
    }

    if (context.metadata) {
      scope.setContext('metadata', context.metadata);
    }

    Sentry.captureException(error);
  });

  logger.error('Error captured with context', {
    error: error.message,
    stack: error.stack,
    ...context,
  });
};

/**
 * Helper to capture messages with context
 */
export const captureMessageWithContext = (
  message: string,
  level: Sentry.SeverityLevel,
  context?: Record<string, any>
) => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('custom', context);
    }
    scope.setLevel(level);
    Sentry.captureMessage(message, level);
  });
};
