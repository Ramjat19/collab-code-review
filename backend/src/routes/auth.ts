import { Router, Response } from "express";
import User from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from 'crypto';
import authMiddleware, { AuthRequest } from "../middleware/auth";
import { validateLogin, validateSignup } from "../middleware/validation";
import { authLimiter, refreshLimiter } from "../middleware/security";
import { validateSecureStrings, logSecurityEvent } from "../utils/security";
import RefreshToken from "../models/RefreshToken";

const router = Router();

// Refresh token settings
const REFRESH_TOKEN_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_DAYS || '7', 10);
const REFRESH_TOKEN_EXPIRES_MS = REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'refreshToken';
// Access token settings (shorter lifetime for better security)
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m'; // default 15 minutes

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none' as 'none' | 'lax' | 'strict',
  path: '/',
  maxAge: REFRESH_TOKEN_EXPIRES_MS
};

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

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

    // Issue JWT and refresh token on signup
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, username: newUser.username },
      (process.env.JWT_SECRET as any),
      ({ expiresIn: ACCESS_TOKEN_EXPIRES, issuer: 'collab-code-review', audience: 'collab-code-review-users' } as any)
    );

    const refreshTokenPlain = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshTokenPlain);
    const refreshTokenDoc = new RefreshToken({
      user: newUser._id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS),
      createdByIp: req.ip
    });
    await refreshTokenDoc.save();
    res.cookie(REFRESH_COOKIE_NAME, refreshTokenPlain, cookieOptions);

    res.status(201).json({ 
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email
      },
        expiresIn: ACCESS_TOKEN_EXPIRES
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
        { id: user._id, email: user.email, username: user.username },
      (process.env.JWT_SECRET as any),
        ({ expiresIn: ACCESS_TOKEN_EXPIRES, issuer: 'collab-code-review', audience: 'collab-code-review-users' } as any)
    );

    // Create refresh token (rotate on login)
    const refreshTokenPlain = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshTokenPlain);
    const refreshTokenDoc = new RefreshToken({
      user: user._id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS),
      createdByIp: req.ip
    });
    await refreshTokenDoc.save();

    // Set refresh token cookie (HttpOnly + Secure in production)
    res.cookie(REFRESH_COOKIE_NAME, refreshTokenPlain, cookieOptions);

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
        expiresIn: ACCESS_TOKEN_EXPIRES
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

// Refresh access token (rotate refresh token)
router.post('/refresh', refreshLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token || typeof token !== 'string') {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    const tokenHash = hashToken(token);
    const existing = await RefreshToken.findOne({ tokenHash });
    if (!existing) {
      logSecurityEvent('INVALID_REFRESH_TOKEN', 'Refresh token not found in DB', req);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (existing.revoked) {
      // Possible token reuse - revoke all user's refresh tokens
      await RefreshToken.updateMany({ user: existing.user }, { revoked: true, revokedAt: new Date() });
      logSecurityEvent('REUSED_REFRESH_TOKEN', `Revoked all tokens for user ${existing.user}`, req);
      return res.status(401).json({ error: 'Refresh token revoked' });
    }

    if (existing.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // Rotate: create new refresh token, revoke old
    const newTokenPlain = generateRefreshToken();
    const newTokenHash = hashToken(newTokenPlain);

    const newTokenDoc = new RefreshToken({
      user: existing.user,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS),
      createdByIp: req.ip
    });
    await newTokenDoc.save();

    existing.revoked = true;
    existing.revokedAt = new Date();
  existing.revokedByIp = (req.ip as string) || 'unknown';
    existing.replacedByToken = newTokenHash;
    await existing.save();

    // Issue new access token
    const user = await User.findById(existing.user);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const accessToken = jwt.sign(
      { id: user._id, email: user.email, username: user.username },
      (process.env.JWT_SECRET as any),
      ({ expiresIn: ACCESS_TOKEN_EXPIRES, issuer: 'collab-code-review', audience: 'collab-code-review-users' } as any)
    );

    // Set cookie with new refresh token
    res.cookie(REFRESH_COOKIE_NAME, newTokenPlain, cookieOptions);

  res.json({ message: 'Token refreshed', token: accessToken, expiresIn: ACCESS_TOKEN_EXPIRES });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ error: 'Unable to refresh token' });
  }
});

// Logout - revoke refresh token and clear cookie
router.post('/logout', refreshLimiter, authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token && typeof token === 'string') {
      const tokenHash = hashToken(token);
      const existing = await RefreshToken.findOne({ tokenHash });
      if (existing) {
        existing.revoked = true;
        existing.revokedAt = new Date();
  existing.revokedByIp = (req.ip as string) || 'unknown';
        await existing.save();
      }
    }

    // Clear cookie
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Unable to logout' });
  }
});

export default router;
