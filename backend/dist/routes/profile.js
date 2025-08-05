"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/profile.ts
const express_1 = require("express");
const client_1 = require("@prisma/client");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/', authMiddleware_1.authenticateToken, async (req, res) => {
    //const userId = (req as any).user.userId;
    const userId = req.userId;
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true },
    });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User profile', user });
});
exports.default = router;
