import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/authMiddleware";

const prisma = new PrismaClient();
const router = Router();

// Get all items
router.get("/", authenticateToken, async (req, res) => {
  const items = await prisma.inventoryItem.findMany();

  const inventoryWithAlerts = items.map((item) => ({
    ...item,
    lowStockAlert: item.quantity <= item.lowStockLimit,
  }));

  res.json(inventoryWithAlerts);
});

// Add new item
router.post("/", authenticateToken, async (req, res) => {
  const { name, category, subtype, quantity, unit, price } = req.body;
  if (!name || !category || !quantity || !unit || !price) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const newItem = await prisma.inventoryItem.create({
    data: { name, category, subtype, quantity, unit, price },
  });

  res.status(201).json(newItem);
});

// Update quantity or details
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const updated = await prisma.inventoryItem.update({
      where: { id: parseInt(id) },
      data,
    });
    res.json(updated);
  } catch (error) {
    res.status(404).json({ error: "Item not found" });
  }
});

// Delete an item
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.inventoryItem.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Item deleted" });
  } catch (error) {
    res.status(404).json({ error: "Item not found" });
  }
});

// POST /inventory/:id/stock-in
router.post("/:id/stock-in", authenticateToken, async (req, res) => {
  const { quantity } = req.body;
  const itemId = parseInt(req.params.id);

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return res.status(404).json({ error: "Item not found" });

  await prisma.inventoryTransaction.create({
    data: { itemId, type: "STOCK_IN", quantity },
  });

  const updated = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { quantity: item.quantity + quantity },
  });

  res.json({ message: "Stock added", updated });
});

// POST /inventory/:id/stock-out
router.post("/:id/stock-out", authenticateToken, async (req, res) => {
  const { quantity } = req.body;
  const itemId = parseInt(req.params.id);

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return res.status(404).json({ error: "Item not found" });
  if (item.quantity < quantity)
    return res.status(400).json({ error: "Insufficient stock" });

  await prisma.inventoryTransaction.create({
    data: { itemId, type: "STOCK_OUT", quantity },
  });

  const updated = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { quantity: item.quantity - quantity },
  });

  res.json({ message: "Stock removed", updated });
});

// GET /inventory/:id/transactions
router.get("/:id/transactions", authenticateToken, async (req, res) => {
  const itemId = parseInt(req.params.id);

  const transactions = await prisma.inventoryTransaction.findMany({
    where: { itemId },
    orderBy: { createdAt: "desc" },
  });

  res.json(transactions);
});


// Increase inventory quantity
router.post("/inventory/:id/increase", authenticateToken, async (req, res) => {
  const itemId = parseInt(req.params.id);
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: "Quantity must be greater than zero" });
  }

  try {
    // Update stock
    const item = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        quantity: {
          increment: quantity,
        },
      },
    });

    // Record transaction
    await prisma.inventoryTransaction.create({
      data: {
        itemId,
        quantity,
        type: "STOCK_IN",
      },
    });

    res.status(200).json({ message: "Inventory increased", item });
  } catch (error) {
    res.status(500).json({ error: "Failed to increase inventory" });
  }
});


export default router;
