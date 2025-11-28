import { Router, Request, Response, NextFunction } from 'express';
import { captureException, captureMessage, addSentryBreadcrumb } from '../config/sentry';

const router = Router();

/**
 * Test endpoint to verify Sentry is working
 * GET /api/test-sentry/error - Throws an error
 * GET /api/test-sentry/message - Sends a message
 * GET /api/test-sentry/breadcrumbs - Tests breadcrumb tracking
 */

// Test error capture
router.get('/error', (req: Request, res: Response, next: NextFunction) => {
  console.log('🧪 Testing Sentry error capture...');
  
  // Add breadcrumb before error
  addSentryBreadcrumb('User triggered test error', 'test', 'info');
  
  // This error will be captured by Sentry
  const error = new Error('Test error from Sentry test endpoint');
  (error as any).statusCode = 500;
  
  next(error); // Will be caught by sentryErrorHandler middleware
});

// Test message capture
router.get('/message', (req: Request, res: Response) => {
  console.log('🧪 Testing Sentry message capture...');
  
  captureMessage('Test message from Sentry test endpoint', 'info', {
    test: true,
    timestamp: new Date().toISOString()
  });
  
  res.json({ 
    success: true, 
    message: 'Message sent to Sentry (check your Sentry dashboard)' 
  });
});

// Test breadcrumbs
router.get('/breadcrumbs', (req: Request, res: Response, next: NextFunction) => {
  console.log('🧪 Testing Sentry breadcrumbs...');
  
  // Add multiple breadcrumbs
  addSentryBreadcrumb('Step 1: User started test', 'test', 'info');
  addSentryBreadcrumb('Step 2: Processing request', 'test', 'info');
  addSentryBreadcrumb('Step 3: About to trigger error', 'test', 'warning');
  
  // Trigger error so breadcrumbs are sent
  const error = new Error('Test error with breadcrumbs');
  (error as any).statusCode = 500;
  
  next(error);
});

// Test manual error capture with context
router.get('/manual', (req: Request, res: Response) => {
  console.log('🧪 Testing manual Sentry error capture with context...');
  
  try {
    // Simulate an error
    throw new Error('Manually captured test error');
  } catch (error) {
    captureException(error as Error, {
      test: {
        endpoint: '/test-sentry/manual',
        timestamp: new Date().toISOString(),
        customData: 'This is test data'
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Error manually captured and sent to Sentry' 
    });
  }
});

export default router;
