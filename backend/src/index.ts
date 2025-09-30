import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import healthRoutes from "./routes/health";
import authRoutes from "./routes/auth";

// dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

//middlewares
app.use(cors());
app.use(express.json());

//routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Collab Code Review API", status: "running" });
});
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
