import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

// CORS Configuration
export const corsConfig = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      // Add your production domains here
      process.env.FRONTEND_URL || 'http://localhost:5173'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-HTTP-Method-Override'
  ],
  maxAge: 86400 // Cache preflight for 24 hours
});

// Helmet Configuration for Security Headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false, // Disable for WebSocket compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Rate Limiting Configurations
export const createRateLimit = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    message: { error: message, retryAfter: Math.ceil(windowMs / 1000) },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        limit: max,
        windowMs
      });
    }
  });

// Tiered Rate Limiting
export const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // 10 attempts per window (increased from 5)
  'Too many authentication attempts, please try again later'
);

export const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  500, // 500 requests per window (increased for better UX)
  'Too many requests, please slow down'
);

export const strictLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  50, // 50 requests per window (increased)
  'Rate limit exceeded for this operation'
);

// Lenient limiter for health and status endpoints
export const healthLimiter = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  1000, // 1000 requests per window
  'Health endpoint rate limit exceeded'
);

// Custom Progressive Delay Middleware
interface DelayStore {
  [key: string]: { hits: number; windowStart: number };
}

const delayStore: DelayStore = {};

export const speedLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const delayThreshold = 50; // Start delaying after 50 requests
  const delayIncrement = 100; // Add 100ms per excess request
  const maxDelay = 3000; // Maximum 3 seconds delay
  
  // Clean old entries
  if (!delayStore[ip] || now - delayStore[ip].windowStart > windowMs) {
    delayStore[ip] = { hits: 0, windowStart: now };
  }
  
  delayStore[ip].hits++;
  const hits = delayStore[ip].hits;
  
  if (hits > delayThreshold) {
    const excessHits = hits - delayThreshold;
    const delay = Math.min(excessHits * delayIncrement, maxDelay);
    
    setTimeout(() => {
      next();
    }, delay);
  } else {
    next();
  }
};

// IP Whitelist Middleware
export const ipWhitelist = (whitelist: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'development') {
      return next(); // Skip IP checking in development
    }
    
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    if (whitelist.length === 0 || whitelist.includes(clientIp as string)) {
      next();
    } else {
      res.status(403).json({ error: 'IP address not allowed' });
    }
  };
};

// Request Size Limiter
export const requestSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = req.headers['content-length'];
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    return res.status(413).json({ error: 'Request entity too large' });
  }
  
  next();
};

// Security Headers Middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove powered by header
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
};