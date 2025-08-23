// src/routes/profile.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';

const router = Router();

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
