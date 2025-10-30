import express from "express";
import { createServer } from "http";
import cors from "cors";
import { 
  corsConfig, 
  helmetConfig, 
  generalLimiter, 
  speedLimiter, 
  securityHeaders, 
  requestSizeLimiter 
} from "./middleware/security";
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

  // Security Middleware (order matters!)
  app.use(helmetConfig); // Security headers
  app.use(securityHeaders); // Additional custom security headers
  app.use(corsConfig); // CORS policy
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
  
  app.use("/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/projects", generalLimiter, projectRoutes);
  app.use("/api/snippets", generalLimiter, snippetRoutes);
  app.use("/api/pull-requests", generalLimiter, pullRequestRoutes);
  app.use("/api/notifications", generalLimiter, notificationRoutes);
  app.use("/api/users", generalLimiter, userRoutes);
  app.use("/api/branch-protection", branchProtectionRoutes);

  return { app, server, socketService };
}