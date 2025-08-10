"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// Get all items
router.get("/", authMiddleware_1.authenticateToken, async (req, res) => {
    const items = await prisma.inventoryItem.findMany();
    const inventoryWithAlerts = items.map((item) => ({
        ...item,
        lowStockAlert: item.quantity <= item.lowStockLimit,
    }));
    res.json(inventoryWithAlerts);
});
// Add new item
router.post("/", authMiddleware_1.authenticateToken, async (req, res) => {
    const { name, category, subtype, quantity, unit, basePrice, sellPrice, limitPrice } = req.body;
    if (!name || !category || !quantity || !unit || basePrice == null || sellPrice == null || limitPrice == null) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    const newItem = await prisma.inventoryItem.create({
        data: { name, category, subtype, quantity, unit, basePrice, sellPrice, limitPrice },
    });
    res.status(201).json(newItem);
});
// Update quantity or details
router.put("/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, category, subtype, quantity, unit, basePrice, sellPrice, limitPrice } = req.body;
    try {
        const updated = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data: {
                ...(name && { name }),
                ...(category && { category }),
                ...(subtype !== undefined && { subtype }),
                ...(quantity !== undefined && { quantity }),
                ...(unit && { unit }),
                ...(basePrice !== undefined && { basePrice }),
                ...(sellPrice !== undefined && { sellPrice }),
                ...(limitPrice !== undefined && { limitPrice }),
            },
        });
        res.json(updated);
    }
    catch (error) {
        res.status(404).json({ error: "Item not found" });
    }
});
// Delete an item
router.delete("/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.inventoryItem.delete({ where: { id: parseInt(id) } });
        res.json({ message: "Item deleted" });
    }
    catch (error) {
        res.status(404).json({ error: "Item not found" });
    }
});
// POST /inventory/:id/stock-in
router.post("/:id/stock-in", authMiddleware_1.authenticateToken, async (req, res) => {
    const { quantity } = req.body;
    const itemId = parseInt(req.params.id);
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item)
        return res.status(404).json({ error: "Item not found" });
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
router.post("/:id/stock-out", authMiddleware_1.authenticateToken, async (req, res) => {
    const { quantity } = req.body;
    const itemId = parseInt(req.params.id);
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item)
        return res.status(404).json({ error: "Item not found" });
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
router.get("/:id/transactions", authMiddleware_1.authenticateToken, async (req, res) => {
    const itemId = parseInt(req.params.id);
    const transactions = await prisma.inventoryTransaction.findMany({
        where: { itemId },
        orderBy: { createdAt: "desc" },
    });
    res.json(transactions);
});
// Increase inventory quantity
router.post("/inventory/:id/increase", authMiddleware_1.authenticateToken, async (req, res) => {
    const itemId = parseInt(req.params.id);
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) {
        return res.status(400).json({ error: "Quantity must be greater than zero" });
    }
    try {
        const item = await prisma.inventoryItem.update({
            where: { id: itemId },
            data: {
                quantity: {
                    increment: quantity,
                },
            },
        });
        await prisma.inventoryTransaction.create({
            data: {
                itemId,
                quantity,
                type: "STOCK_IN",
            },
        });
        res.status(200).json({ message: "Inventory increased", item });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to increase inventory" });
    }
});
exports.default = router;
