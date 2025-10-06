import express from "express";
import { createServer } from "http";
import dotenv from "dotenv";
import cors from "cors";
import healthRoutes from "./routes/health";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/project";
import snippetRoutes from "./routes/snippet";
import pullRequestRoutes from "./routes/pullRequest";
import notificationRoutes from "./routes/notification";
import userRoutes from "./routes/user";
import SocketService from "./services/SocketService";

import connectDB from "./config/db";

dotenv.config();

connectDB();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 4000;

// Initialize Socket.IO
const socketService = new SocketService(server);

// Make io instance available globally for services
(global as any).io = socketService.ioInstance;

//middlewares
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174", 
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
  ],
  credentials: true
}));
app.use(express.json());

// Make socket service available in routes
app.set('socketService', socketService);

//routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Collab Code Review API", status: "running" });
});
// Routes
app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/snippets", snippetRoutes);
app.use("/api/pull-requests", pullRequestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Socket.IO server ready for connections`);
});
