// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = 'your_jwt_secret_here'; // Replace with your actual secret

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

    // decoded is an object if token is valid
    if (typeof decoded === 'object' && decoded && 'userId' in decoded) {
      (req as any).userId = (decoded as any).userId;
      console.log('User ID from token:', (req as any).userId);
      return next();
    }

    return res.status(403).json({ error: 'Malformed token payload' });
  });
};
