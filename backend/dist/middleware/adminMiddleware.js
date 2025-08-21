"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
const requireAdmin = (req, res, next) => {
    const userRole = req.role;
    // Log for debugging
    console.log('Admin middleware - User ID:', req.userId, 'Role:', userRole);
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
    console.log('Admin middleware - Access granted for user:', req.userId);
    next();
};
exports.requireAdmin = requireAdmin;
