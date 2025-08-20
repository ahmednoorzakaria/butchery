"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
const requireAdmin = (req, res, next) => {
    const userRole = req.role;
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
exports.requireAdmin = requireAdmin;
