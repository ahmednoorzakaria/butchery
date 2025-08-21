// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here_change_this_in_production";

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
      console.log('JWT verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid token' });
    }

    console.log('JWT decoded successfully:', decoded);
    if (decoded && typeof decoded === 'object') {
      console.log('Decoded token keys:', Object.keys(decoded));
      console.log('Decoded token values:', Object.values(decoded));
    }

    if (typeof decoded === 'object' && decoded && 'userId' in decoded) {
      (req as any).userId = (decoded as any).userId;
      (req as any).role = (decoded as any).role; // 👈 Add role to request
      
      // Log for debugging
      console.log('Auth middleware - User ID:', (req as any).userId, 'Role:', (req as any).role);
      console.log('Request object after setting role:', { userId: (req as any).userId, role: (req as any).role });
      
      return next();
    }

    console.log('JWT payload malformed:', decoded);
    return res.status(403).json({ error: 'Malformed token payload' });
  });
};
