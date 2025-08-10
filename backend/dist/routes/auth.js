"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.ts
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// auth.ts
const JWT_SECRET = "jwtsecretkey"; // 👈 use a secure secret in production
// Register
router.post("/register", async (req, res) => {
    try {
        const { email, phone, name, password, role } = req.body;
        if (!email || !phone || !name || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }
        // Check for existing user by email, phone, or name
        const existing = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { phone }, { name }],
            },
        });
        if (existing) {
            return res.status(400).json({ error: "User with same email, phone, or name already exists" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const normalizedRole = role?.toUpperCase() === "ADMIN" ? "ADMIN" : "SALES";
        const user = await prisma.user.create({
            data: {
                name,
                email,
                phone,
                password: hashedPassword,
                role: normalizedRole, // 👈 default to SALES if not provided
            },
        });
        res
            .status(201)
            .json({ message: "User registered successfully", userId: user.id, role: user.role });
    }
    catch (err) {
        console.error("Register failed:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});
// Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: "Missing email or password" });
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(401).json({ error: "Invalid credentials" });
        const match = await bcryptjs_1.default.compare(password, user.password);
        if (!match)
            return res.status(401).json({ error: "Invalid credentials" });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, {
            expiresIn: "6h",
        });
        console.log("User logged in:", user.id);
        res.json({
            token,
            user: {
                id: user.id,
                role: user.role, // ✅ include role
            },
        });
    }
    catch (err) {
        console.error("Login failed:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
