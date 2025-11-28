import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * 
 * Features:
 * - Automatic error capture
 * - Performance monitoring
 * - Profiling for performance bottlenecks
 * - User context tracking
 * - Custom tags and metadata
 * - Release tracking
 */
export const initializeSentry = () => {
  const sentryDsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  const release = process.env.npm_package_version || 'unknown';

  // Only initialize if DSN is provided
  if (!sentryDsn) {
    console.warn('SENTRY_DSN not configured. Sentry error tracking is disabled.');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    release: `collab-code-review@${release}`,

    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    
    // Profiling
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    integrations: [
      // Automatic instrumentation
      nodeProfilingIntegration(),
    ],

    // Send default PII (IP addresses, user context)
    sendDefaultPii: true,

    // Error filtering
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Don't send certain errors to Sentry
      if (error && typeof error === 'object' && 'statusCode' in error) {
        const statusCode = (error as any).statusCode;
        // Skip client errors (4xx) except authentication issues
        if (statusCode >= 400 && statusCode < 500 && statusCode !== 401 && statusCode !== 403) {
          return null;
        }
      }

      // Filter out known non-critical errors
      if (event.message?.includes('ECONNRESET') || event.message?.includes('EPIPE')) {
        return null;
      }

      return event;
    },

    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb, hint) {
      // Don't log sensitive data in breadcrumbs
      if (breadcrumb.category === 'http' && breadcrumb.data) {
        // Remove sensitive headers
        if (breadcrumb.data.headers) {
          delete breadcrumb.data.headers.authorization;
          delete breadcrumb.data.headers.cookie;
        }
        // Remove sensitive query params
        if (breadcrumb.data.query_string) {
          breadcrumb.data.query_string = breadcrumb.data.query_string
            .replace(/token=[^&]+/gi, 'token=[REDACTED]')
            .replace(/password=[^&]+/gi, 'password=[REDACTED]');
        }
      }
      return breadcrumb;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser/client errors that shouldn't be tracked
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      // Network errors
      'NetworkError',
      'Network request failed',
      // Validation errors (these should be handled gracefully)
      'ValidationError',
    ],

    // Sample rate for error events (100% = capture all errors)
    sampleRate: 1.0,

    // Maximum breadcrumbs to keep
    maxBreadcrumbs: 50,

    // Attach stack traces to messages
    attachStacktrace: true,

    // Enable debug mode only when explicitly needed
    debug: false,

    // Server name
    serverName: process.env.SERVER_NAME || 'collab-code-review-backend',
  });

  console.log(`Sentry initialized for ${environment} environment`);
};

/**
 * Set user context for error tracking
 */
export const setSentryUser = (user: {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}) => {
  const userData: Record<string, string> = { id: user.id };
  if (user.email) userData.email = user.email;
  if (user.username) userData.username = user.username;
  if (user.role) userData.role = user.role;
  
  Sentry.setUser(userData);
};

/**
 * Clear user context (e.g., on logout)
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Add custom context to error reports
 */
export const setSentryContext = (key: string, context: Record<string, any>) => {
  Sentry.setContext(key, context);
};

/**
 * Add tags for filtering in Sentry dashboard
 */
export const setSentryTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

/**
 * Add breadcrumb for tracking user actions
 */
export const addSentryBreadcrumb = (
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
) => {
  const breadcrumb: Sentry.Breadcrumb = {
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  };
  
  if (data) {
    breadcrumb.data = data;
  }
  
  Sentry.addBreadcrumb(breadcrumb);
};

/**
 * Manually capture an exception
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
};

/**
 * Capture a message (for non-error events)
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) => {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureMessage(message, level);
    });
  } else {
    Sentry.captureMessage(message, level);
  }
};

/**
 * Start a performance transaction
 */
export const startTransaction = (
  name: string,
  op: string,
  data?: Record<string, any>
) => {
  const options: any = { name, op };
  if (data) {
    options.attributes = data;
  }
  return Sentry.startSpan(options, (span) => span);
};

/**
 * Get current scope for manual instrumentation
 */
export const getSentryScope = () => {
  return Sentry.getCurrentScope();
};

export { Sentry };
