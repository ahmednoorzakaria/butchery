// src/routes/profile.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticateToken, async (req, res) => {
  //const userId = (req as any).user.userId;
  const userId = (req as any).userId;


  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ message: 'User profile', user });
});

export default router;
