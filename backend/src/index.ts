import dotenv from "dotenv";
import connectDB from "./config/db";
import { createApp } from "./app";

dotenv.config();

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
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Socket.IO server ready for connections`);
});
