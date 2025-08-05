import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/authMiddleware";
import PDFDocument from "pdfkit";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays 
} from "date-fns";


const prisma = new PrismaClient();
const router = Router();

// Create Customer
router.post("/customers", authenticateToken, async (req, res) => {
  const { name, phone } = req.body;
  try {
    const customer = await prisma.customer.create({ data: { name, phone } });
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ error: "Phone number must be unique" });
  }
});

// Get Customers
router.get("/customers", authenticateToken, async (req, res) => {
  const customers = await prisma.customer.findMany();
  res.json(customers);
});

// Record Sale
router.post("/sales", authenticateToken, async (req, res) => {
  const { customerId, items, discount = 0, paidAmount, paymentType } = req.body;
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ error: "User not authenticated" });

  if (!items || items.length === 0)
    return res.status(400).json({ error: "Items are required" });

  let totalAmount = 0;
  const saleItemsData = [];

  for (const item of items) {
    const inventory = await prisma.inventoryItem.findUnique({
      where: { id: item.itemId },
    });
    if (!inventory || inventory.quantity < item.quantity) {
      return res
        .status(400)
        .json({ error: `Insufficient stock for item ${item.itemId}` });
    }
    totalAmount += item.quantity * item.price;
    saleItemsData.push({
      itemId: item.itemId,
      quantity: item.quantity,
      price: item.price,
    });
  }

  const netAmount = totalAmount - discount;

  const sale = await prisma.sale.create({
    data: {
      customerId,
      userId,
      totalAmount: netAmount,
      discount,
      paidAmount,
      paymentType,
      items: { create: saleItemsData },
    },
    include: { customer: true, user: true },
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

// Record Payment
router.post("/customers/:id/payments", authenticateToken, async (req, res) => {
  const customerId = parseInt(req.params.id);
  const { amount, paymentType } = req.body;
  if (!amount || isNaN(amount)) return res.status(400).json({ error: "Valid amount is required" });

  try {
    const allSales = await prisma.sale.findMany({
      where: { customerId },
      orderBy: { createdAt: "asc" },
    });

    const unpaidSales = allSales.filter(s => s.totalAmount > s.paidAmount);
    let remainingPayment = amount;

    for (const sale of unpaidSales) {
      const saleDue = sale.totalAmount - sale.paidAmount;
      if (saleDue <= 0) continue;
      const paymentToApply = Math.min(saleDue, remainingPayment);

      await prisma.sale.update({
        where: { id: sale.id },
        data: { paidAmount: { increment: paymentToApply } },
      });

      await prisma.customerTransaction.create({
        data: {
          customerId,
          amount: paymentToApply,
          reason: `Payment of ${paymentToApply} applied to Sale #${sale.id} via ${paymentType}`,
        },
      });

      remainingPayment -= paymentToApply;
      if (remainingPayment <= 0) break;
    }

    if (remainingPayment > 0) {
      await prisma.customerTransaction.create({
        data: {
          customerId,
          amount: remainingPayment,
          reason: `Advance payment via ${paymentType}`,
        },
      });
    }

    return res.status(201).json({ message: "Payment recorded and applied to outstanding sales" });
  } catch (error) {
    console.error("Error recording payment:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get Customer Transactions
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

// Get Receipt
router.get("/sales/:id/receipt", authenticateToken, async (req, res) => {
  const saleId = parseInt(req.params.id);
  const format = req.query.format || "json";
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      customer: true,
      user: true,
      items: { include: { item: true } },
    },
  });
  if (!sale) return res.status(404).json({ error: "Sale not found" });

  if (format === "pdf") {
    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="receipt.pdf"');
    doc.pipe(res);
    doc.fontSize(18).text("Receipt", { align: "center" });
    doc.text(`Customer: ${sale.customer.name} (${sale.customer.phone})`);
    doc.text(`Date: ${sale.createdAt}`);
    doc.moveDown();
    sale.items.forEach((item) => {
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

// Sales Filter & Summary
router.get("/sales", authenticateToken, async (req, res) => {
  let { start, end } = req.query as { start?: string; end?: string };
  if (!start || isNaN(Date.parse(start))) start = subDays(new Date(), 7).toISOString();
  if (!end || isNaN(Date.parse(end))) end = new Date().toISOString();

  try {
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: new Date(start), lte: new Date(end) },
      },
      include: {
        customer: true,
        items: { include: { item: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(sales);
  } catch (error) {
    console.error("Failed to fetch sales:", error);
    res.status(500).json({ error: "Server error fetching sales" });
  }
});

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
    orderBy: { createdAt: "desc" },
  });
  res.json(sales);
});

router.get("/sales/report", authenticateToken, async (req, res) => {
  const { range } = req.query;
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (range) {
    case "weekly":
      start = startOfWeek(now);
      end = endOfWeek(now);
      break;
    case "monthly":
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case "yearly":
      start = startOfYear(now);
      end = endOfYear(now);
      break;
    default:
      start = startOfDay(now);
      end = endOfDay(now);
      break;
  }

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: { items: { include: { item: true } } },
  });

  const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPaid = sales.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0);

  const itemSalesCount: Record<string, { name: string; quantity: number }> = {};
  for (const sale of sales) {
    for (const si of sale.items) {
      const id = si.itemId;
      const name = si.item.name;
      if (!itemSalesCount[id]) itemSalesCount[id] = { name, quantity: 0 };
      itemSalesCount[id].quantity += si.quantity;
    }
  }

  const sortedItems = Object.entries(itemSalesCount)
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .map(([id, data]) => ({ id, ...data }));

  res.json({
    range,
    totalSales,
    totalPaid,
    totalDiscount,
    numberOfSales: sales.length,
    mostSoldItem: sortedItems[0] || null,
    leastSoldItem: sortedItems[sortedItems.length - 1] || null,
  });
});

router.get("/reports/outstanding-balances", authenticateToken, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({ include: { transactions: true } });
    const balances = customers.map((c) => {
      const balance = c.transactions.reduce((sum, tx) => sum + tx.amount, 0);
      return { customerId: c.id, name: c.name, balance };
    });
    res.json(balances.filter((c) => c.balance < 0));
  } catch (error) {
    console.error("Error fetching balances:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/reports/top-products", authenticateToken, async (req, res) => {
  const { start, end } = req.query;
  const startDate = start ? new Date(start as string) : subDays(new Date(), 7);
  const endDate = end ? new Date(end as string) : new Date();

  try {
    const items = await prisma.saleItem.groupBy({
      by: ["itemId"],
      where: {
        sale: { createdAt: { gte: startDate, lte: endDate } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    });

    const withNames = await Promise.all(
      items.map(async (item) => {
        const itemInfo = await prisma.inventoryItem.findUnique({
          where: { id: item.itemId },
        });
        return {
          itemId: item.itemId,
          name: itemInfo?.name,
          quantitySold: item._sum.quantity,
        };
      })
    );
    res.json(withNames);
  } catch (error) {
    console.error("Top products error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/reports/inventory-usage", authenticateToken, async (req, res) => {
  try {
    const usage = await prisma.saleItem.groupBy({
      by: ["itemId"],
      _sum: { quantity: true },
    });

    const result = await Promise.all(
      usage.map(async (entry) => {
        const item = await prisma.inventoryItem.findUnique({
          where: { id: entry.itemId },
        });
        return {
          itemId: entry.itemId,
          name: item?.name,
          totalUsed: entry._sum.quantity,
          currentStock: item?.quantity,
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error("Inventory usage error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/reports/user-performance", authenticateToken, async (req, res) => {
  try {
    const userSales = await prisma.sale.groupBy({
      by: ["userId"],
      _sum: { totalAmount: true, paidAmount: true },
      _count: { _all: true },
    });

    const results = await Promise.all(
      userSales.map(async (entry) => {
        const user = entry.userId
          ? await prisma.user.findUnique({ where: { id: entry.userId } })
          : null;

        return {
          userId: entry.userId,
          name: user?.name || "Unknown",
          email: user?.email || "N/A",
          totalSales: entry._sum.totalAmount || 0,
          totalPaid: entry._sum.paidAmount || 0,
          saleCount: entry._count._all,
        };
      })
    );
    res.json(results);
  } catch (error) {
    console.error("User performance error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
