import { Router } from "express";

const router = Router();

// Dummy login route
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "ram" && password === "1234") {
    return res.json({ success: true, token: "dummy-jwt-token" });
  }

  res.status(401).json({ success: false, message: "Invalid credentials" });
});

export default router;
