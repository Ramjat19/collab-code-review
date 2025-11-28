import dotenv from "dotenv";
dotenv.config();

// Initialize Sentry FIRST
import { initializeSentry } from "./config/sentry";
initializeSentry();

import connectDB from "./config/db";
import { createApp } from "./app";
import logger from "./utils/logger";

connectDB();

const { app, server, socketService } = createApp();

// Make io instance available globally for services
(global as any).io = socketService.ioInstance;

// Make socket service available in routes
app.set('socketService', socketService);

//routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Collab Code Review API", status: "running" });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Socket.IO server ready for connections`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  //log to console in case Winston console transport is disabled
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
