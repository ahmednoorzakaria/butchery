// src/routes/auth.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();
const prisma = new PrismaClient();

// auth.ts
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here_change_this_in_production";
console.log("JWT_SECRET configured:", JWT_SECRET ? "YES" : "NO");
console.log("JWT_SECRET length:", JWT_SECRET?.length || 0);

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

    const hashedPassword = await bcrypt.hash(password, 10);
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
  } catch (err) {
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
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    console.log("User found in database:", { id: user.id, name: user.name, email: user.email, role: user.role });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    console.log("Password verified successfully");
    console.log("Creating JWT token for user:", { id: user.id, role: user.role });
    
    const tokenPayload = { userId: user.id, role: user.role };
    console.log("JWT payload to be signed:", tokenPayload);
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: "6h",
    });
    
    console.log("JWT token created successfully");
    console.log("Token length:", token.length);
    console.log("User logged in:", user.id);

    res.json({
      token,
      user: {
        id: user.id,
        role: user.role, // ✅ include role
      },
    });
  } catch (err) {
    console.error("Login failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
