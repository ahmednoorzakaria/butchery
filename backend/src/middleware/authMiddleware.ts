// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = "jwtsecretkey";

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    if (typeof decoded === 'object' && decoded && 'userId' in decoded) {
      (req as any).userId = (decoded as any).userId;
      (req as any).role = (decoded as any).role; // 👈 Add role to request
      return next();
    }

    return res.status(403).json({ error: 'Malformed token payload' });
  });
};
