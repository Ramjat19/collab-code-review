import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import healthRoutes from "./routes/health";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/project";
import snippetRoutes from "./routes/snippet";
import pullRequestRoutes from "./routes/pullRequest";

import connectDB from "./config/db";

dotenv.config();

connectDB();

const app = express();
const PORT = process.env.PORT || 4000;

//middlewares
app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
