import { Router, Response } from "express";
import User from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import authMiddleware, { AuthRequest } from "../middleware/auth";
import { validateLogin, validateSignup } from "../middleware/validation";
import { authLimiter } from "../middleware/security";
import { validateSecureStrings, logSecurityEvent } from "../utils/security";

const router = Router();

// Register
router.post("/signup", authLimiter, validateSignup, async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // Ensure all inputs are strings to prevent NoSQL injection
    const validation = validateSecureStrings({ email, username, password });
    if (!validation.isValid) {
      logSecurityEvent('INVALID_INPUT_TYPE', `Signup attempt with invalid input types: ${validation.invalidFields.join(', ')}`, req);
      return res.status(400).json({
        error: "Invalid request",
        message: "All fields must be strings"
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        error: "User already exists",
        message: "An account with this email already exists" 
      });
    }

    // Hash password with higher rounds for better security
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    // Log successful registration (without sensitive data)
    console.log(`New user registered: ${username} (${email})`);

    res.status(201).json({ 
      message: "User registered successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      error: "Registration failed",
      message: "Unable to create account. Please try again later." 
    });
  }
});

// Login
router.post("/login", authLimiter, validateLogin, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    // Ensure email and password are strings to prevent NoSQL injection
    const validation = validateSecureStrings({ email, password });
    if (!validation.isValid) {
      logSecurityEvent('NOSQL_INJECTION_ATTEMPT', `Login attempt with invalid input types: ${validation.invalidFields.join(', ')}`, req);
      return res.status(400).json({
        error: "Invalid request",
        message: "Email and password must be strings"
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      // Log failed login attempt (don't specify if email exists or not)
      console.log(`Failed login attempt for email: ${email} from IP: ${req.ip}`);
      return res.status(401).json({ 
        error: "Invalid credentials",
        message: "Email or password is incorrect" 
      });
    }

    // Compare password with timing-safe comparison
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Failed password for user: ${user.username} from IP: ${req.ip}`);
      return res.status(401).json({ 
        error: "Invalid credentials",
        message: "Email or password is incorrect" 
      });
    }

    // Generate JWT with stronger settings
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        username: user.username,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET as string,
      { 
        expiresIn: "24h",
        issuer: "collab-code-review",
        audience: "collab-code-review-users"
      }
    );

    // Log successful login
    console.log(`Successful login: ${user.username} from IP: ${req.ip}`);

    res.json({ 
      message: "Login successful", 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      expiresIn: "24h"
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      error: "Login failed",
      message: "Unable to process login. Please try again later." 
    });
  }
});

// Protected route - get current user
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
});

export default router;
