"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here_change_this_in_production";
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access token missing' });
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
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
            req.userId = decoded.userId;
            req.role = decoded.role; // 👈 Add role to request
            // Log for debugging
            console.log('Auth middleware - User ID:', req.userId, 'Role:', req.role);
            console.log('Request object after setting role:', { userId: req.userId, role: req.role });
            return next();
        }
        console.log('JWT payload malformed:', decoded);
        return res.status(403).json({ error: 'Malformed token payload' });
    });
};
exports.authenticateToken = authenticateToken;
