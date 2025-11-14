import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from 'cookie-parser';
import { createServer } from "http";
import cors from "cors";
import logger from "./utils/logger";
import { 
  corsConfig, 
  helmetConfig, 
  generalLimiter,
  securityHeaders, 
  requestSizeLimiter
} from "./middleware/security";
import { csrfProtection, csrfErrorHandler } from "./middleware/csrf";
import { requestLogger, errorLogger, notFoundLogger, performanceLogger } from "./middleware/logging";
import healthRoutes from "./routes/health";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/project";
import snippetRoutes from "./routes/snippet";
import pullRequestRoutes from "./routes/pullRequest";
import notificationRoutes from "./routes/notification";
import userRoutes from "./routes/user";
import branchProtectionRoutes from "./routes/branchProtection";
import SocketService from "./services/SocketService";

export function createApp() {
  const app = express();
  const server = createServer(app);

  // Initialize Socket.IO service
  const socketService = new SocketService(server);

  // Logging Middleware (early in the chain)
  app.use(requestLogger);
  app.use(performanceLogger(1000)); // Log requests taking > 1 second

  // Security Middleware (order matters!)
  app.use(helmetConfig); // Security headers
  app.use(securityHeaders); // Additional custom security headers
  app.use(corsConfig); // CORS policy
  // Cookie parser (needed for refresh token cookie parsing)
  app.use(cookieParser());
  // CSRF Protection (defense in depth with SameSite cookies)
  app.use(csrfProtection);
  app.use(requestSizeLimiter); // Request size limiting
  // Note: Rate limiting now applied per-route for better control
  
  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Trust proxy for accurate IP addresses (important for rate limiting)
  app.set('trust proxy', 1);

  // Routes
  app.get("/", (req, res) => {
    res.json({ message: "Welcome to Collab Code Review API", status: "running" });
  });

  // Add endpoint to get CSRF token (global for all routes)
  app.get("/api/csrf-token", (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });
  
  
  app.use("/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/projects", generalLimiter, projectRoutes);
  app.use("/api/snippets", generalLimiter, snippetRoutes);
  app.use("/api/pull-requests", generalLimiter, pullRequestRoutes);
  app.use("/api/notifications", generalLimiter, notificationRoutes);
  app.use("/api/users", generalLimiter, userRoutes);
  app.use("/api/branch-protection", branchProtectionRoutes);

  // 404 handler
  app.use(notFoundLogger);

  // Error logging middleware (before error handlers)
  app.use(errorLogger);

  // CSRF error handler
  app.use(csrfErrorHandler);

  // Log application start
  logger.info('Application initialized', {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || 5000,
  });

  return { app, server, socketService };
}