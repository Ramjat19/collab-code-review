import { Router, Request, Response } from "express";
import { healthLimiter } from "../middleware/security";

const router = Router();

router.get("/", healthLimiter, (req: Request, res: Response) => {
  const securityHeaders = {
    helmet: req.headers['x-content-type-options'] ? 'enabled' : 'disabled',
    cors: req.headers.origin ? 'configured' : 'no-origin',
    rateLimit: req.headers['x-ratelimit-limit'] ? 'active' : 'inactive'
  };

  res.json({ 
    status: "ok", 
    message: "Backend running smoothly",
    timestamp: new Date().toISOString(),
    security: securityHeaders,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Security test endpoint (shows rate limiting in action)
router.get("/security-test", healthLimiter, (req: Request, res: Response) => {
  res.json({
    message: "Security middleware active",
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    rateLimitInfo: {
      limit: req.headers['x-ratelimit-limit'],
      remaining: req.headers['x-ratelimit-remaining'],
      reset: req.headers['x-ratelimit-reset']
    }
  });
});

export default router;

