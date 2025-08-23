"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/profile.ts
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
router.get('/', authMiddleware_1.authenticateToken, async (req, res) => {
    //const userId = (req as any).user.userId;
    const userId = req.userId;
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true },
    });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User profile', user });
});
exports.default = router;
