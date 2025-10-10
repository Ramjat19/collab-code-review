import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: any;
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  const tokenParts = authHeader.split(" ");
  const token = tokenParts[1];
  
  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const secret = process.env.JWT_SECRET || 'default-secret-for-development';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Token is not valid" });
  }
};

export default authMiddleware;
