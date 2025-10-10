import express from "express";
import { createServer } from "http";
import cors from "cors";
import healthRoutes from "./routes/health";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/project";
import snippetRoutes from "./routes/snippet";
import pullRequestRoutes from "./routes/pullRequest";
import notificationRoutes from "./routes/notification";
import userRoutes from "./routes/user";
import SocketService from "./services/SocketService";

export function createApp() {
  const app = express();
  const server = createServer(app);

  // Initialize Socket.IO service
  const socketService = new SocketService(server);

  // Middleware
  app.use(cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174", 
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "https://collab-code-review-5gi4vw7jd-ram-prasads-projects-12031425.vercel.app"
    ],
    credentials: true
  }));
  app.use(express.json());

  // Routes
  app.get("/", (req, res) => {
    res.json({ message: "Welcome to Collab Code Review API", status: "running" });
  });
  
  app.use("/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/snippets", snippetRoutes);
  app.use("/api/pull-requests", pullRequestRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/users", userRoutes);

  return { app, server, socketService };
}