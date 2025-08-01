// src/routes/auth.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET =  'your_jwt_secret_here';

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, phone, name, password } = req.body;

    if (!email || !phone || !name || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });

    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, phone, password: hashedPassword },
    });

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
   } catch (err) {
    console.error("Login failed:", err);
    return res.status(500).json({ error: 'Internal server error' });
  }

});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '6h' });
    console.log("User logged in:", user.id);

    res.json({ token , user: { id: user.id } });
  } catch (err) {
    console.error("Login failed:", err);
    return res.status(500).json({ error: 'Internal server error' });
  }

});

export default router;
