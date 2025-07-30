import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/authMiddleware";
import PDFDocument from 'pdfkit';
import { subDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

const prisma = new PrismaClient();
const router = Router();

// Add a customer
router.post("/customers", authenticateToken, async (req, res) => {
  const { name, phone } = req.body;
  try {
    const customer = await prisma.customer.create({ data: { name, phone } });
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ error: "Phone number must be unique" });
  }
});

// List all customers
router.get("/customers", authenticateToken, async (req, res) => {
  const customers = await prisma.customer.findMany();
  res.json(customers);
});

// Perform a sale
router.post("/sales", authenticateToken, async (req, res) => {
  const { customerId, items, discount = 0, paidAmount, paymentType } = req.body;

  if (!items || items.length === 0)
    return res.status(400).json({ error: "Items are required" });

  let totalAmount = 0;
  const saleItemsData = [];

  for (const item of items) {
    const inventory = await prisma.inventoryItem.findUnique({ where: { id: item.itemId } });
    if (!inventory || inventory.quantity < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for item ${item.itemId}` });
    }
    totalAmount += item.quantity * item.price;
    saleItemsData.push({ itemId: item.itemId, quantity: item.quantity, price: item.price });
  }

  const netAmount = totalAmount - discount;

  const sale = await prisma.sale.create({
    data: {
      customerId,
      totalAmount,
      discount,
      paidAmount,
      paymentType,
      items: { create: saleItemsData },
    },
  });

  for (const item of items) {
    await prisma.inventoryItem.update({
      where: { id: item.itemId },
      data: { quantity: { decrement: item.quantity } },
    });
    await prisma.inventoryTransaction.create({
      data: {
        itemId: item.itemId,
        type: "STOCK_OUT",
        quantity: item.quantity,
      },
    });
  }

  const balance = paidAmount - netAmount;
  await prisma.customerTransaction.create({
    data: {
      customerId,
      amount: balance,
      reason: "Sale",
    },
  });

  res.status(201).json({ sale });
});

// Record a payment for a customer
router.post("/customers/:id/payments", authenticateToken, async (req, res) => {
  const customerId = parseInt(req.params.id);
  const { amount, paymentType } = req.body;

  if (!amount || isNaN(amount)) {
    return res.status(400).json({ error: "Valid amount is required" });
  }

  await prisma.customerTransaction.create({
    data: {
      customerId,
      amount: amount, // Positive to reduce debt
      reason: `Payment via ${paymentType}`,
    },
  });

  res.status(201).json({ message: "Payment recorded successfully" });
});

// View customer balance and transactions
router.get("/customers/:id/transactions", authenticateToken, async (req, res) => {
  const customerId = parseInt(req.params.id);
  const transactions = await prisma.customerTransaction.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
  const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const status = balance === 0 ? "Settled" : balance > 0 ? "Credit" : "Due";
  res.json({ balance, status, transactions });
});

// Receipt generator
router.get("/sales/:id/receipt", authenticateToken, async (req, res) => {
  const saleId = parseInt(req.params.id);
  const format = req.query.format || "json";
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      customer: true,
      items: { include: { item: true } },
    },
  });
  if (!sale) return res.status(404).json({ error: "Sale not found" });

  if (format === "pdf") {
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="receipt.pdf"');
    doc.pipe(res);
    doc.fontSize(18).text('Receipt', { align: 'center' });
    doc.text(`Customer: ${sale.customer.name} (${sale.customer.phone})`);
    doc.text(`Date: ${sale.createdAt}`);
    doc.moveDown();
    sale.items.forEach(item => {
      doc.text(`${item.item.name} x${item.quantity} @ ${item.price} = ${item.price * item.quantity}`);
    });
    doc.moveDown();
    doc.text(`Discount: ${sale.discount}`);
    doc.text(`Total: ${sale.totalAmount}`);
    doc.text(`Paid: ${sale.paidAmount}`);
    doc.end();
  } else {
    res.json(sale);
  }
});

// Sales summary by date
router.get("/sales", authenticateToken, async (req, res) => {
  let { start, end } = req.query as { start?: string; end?: string };
  if (!start || isNaN(Date.parse(start))) start = subDays(new Date(), 7).toISOString();
  if (!end || isNaN(Date.parse(end))) end = new Date().toISOString();

  try {
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: new Date(start), lte: new Date(end) } },
      include: { customer: true, items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(sales);
  } catch (error) {
    console.error("Failed to fetch sales:", error);
    res.status(500).json({ error: "Server error fetching sales" });
  }
});

// Filter sales by customer/date
router.get("/sales/filter", authenticateToken, async (req, res) => {
  const { customerId, start, end } = req.query;
  const sales = await prisma.sale.findMany({
    where: {
      customerId: parseInt(customerId as string),
      createdAt: {
        gte: new Date(start as string),
        lte: new Date(end as string),
      },
    },
    include: { items: true, customer: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(sales);
});

// Daily/weekly sales report
router.get("/sales/report", authenticateToken, async (req, res) => {
  const { range } = req.query;
  const now = new Date();
  const start = range === "weekly" ? startOfWeek(now) : startOfDay(now);
  const end = range === "weekly" ? endOfWeek(now) : endOfDay(now);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lte: end } },
  });

  const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalPaid = sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
  const totalDiscount = sales.reduce((sum, sale) => sum + sale.discount, 0);

  res.json({ totalSales, totalPaid, totalDiscount, numberOfSales: sales.length });
});

export default router;
