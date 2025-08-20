import { Request, Response, NextFunction } from "express";

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userRole = (req as any).role;
  
  if (!userRole) {
    return res.status(401).json({ error: 'User role not found' });
  }
  
  if (userRole !== 'ADMIN') {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'Only administrators can perform this action'
    });
  }
  
  next();
};
