import { Request, Response, NextFunction } from "express";

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userRole = (req as any).role;
  
  // Log for debugging
  console.log('Admin middleware - User ID:', (req as any).userId, 'Role:', userRole);
  
  if (!userRole) {
    console.log('Admin middleware - No role found in request');
    return res.status(401).json({ error: 'User role not found' });
  }
  
  if (userRole !== 'ADMIN') {
    console.log('Admin middleware - User role is not ADMIN:', userRole);
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'Only administrators can perform this action'
    });
  }
  
  console.log('Admin middleware - Access granted for user:', (req as any).userId);
  next();
};
