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
      totalAmount : netAmount,
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

  try {
    // Get all sales for the customer, ordered oldest first
    const allSales = await prisma.sale.findMany({
      where: { customerId },
      orderBy: { createdAt: "asc" },
    });

    // Filter sales that are not fully paid
    const unpaidSales = allSales.filter(sale => sale.totalAmount > sale.paidAmount);

    let remainingPayment = amount;

    for (const sale of unpaidSales) {
      const saleDue = sale.totalAmount - sale.paidAmount;
      if (saleDue <= 0) continue;

      const paymentToApply = Math.min(saleDue, remainingPayment);

      // Update the sale with the partial or full payment
      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          paidAmount: {
            increment: paymentToApply,
          },
        },
      });

      // Record a transaction for this payment
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

    // If there's leftover payment, treat it as advance/credit
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

//Returns a list of customers with a negative balance (i.e. customers who owe money).

router.get("/reports/outstanding-balances", authenticateToken, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        transactions: true,
      },
    });

    const balances = customers.map((customer) => {
      const balance = customer.transactions.reduce((sum, tx) => sum + tx.amount, 0);
      return {
        customerId: customer.id,
        name: customer.name,
        balance,
      };
    });

    const withNegativeBalance = balances.filter(c => c.balance < 0);

    res.json(withNegativeBalance);
  } catch (error) {
    console.error("Error fetching outstanding balances:", error);
    res.status(500).json({ error: "Server error" });
  }
});

//✅ 2. GET /reports/top-products?start=...&end=...


router.get("/reports/top-products", authenticateToken, async (req, res) => {
  const { start, end } = req.query;

  const startDate = start ? new Date(start as string) : subDays(new Date(), 7);
  const endDate = end ? new Date(end as string) : new Date();

  try {
    const items = await prisma.saleItem.groupBy({
      by: ['itemId'],
      where: {
        sale: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10, // return top 10
    });

    const withNames = await Promise.all(items.map(async item => {
      const itemInfo = await prisma.inventoryItem.findUnique({ where: { id: item.itemId } });
      return {
        itemId: item.itemId,
        name: itemInfo?.name,
        quantitySold: item._sum.quantity,
      };
    }));

    res.json(withNames);
  } catch (error) {
    console.error("Error fetching top products:", error);
    res.status(500).json({ error: "Server error" });
  }
});


//✅ 3. GET /reports/inventory-usage

router.get("/reports/inventory-usage", authenticateToken, async (req, res) => {
  try {
    const usage = await prisma.saleItem.groupBy({
      by: ['itemId'],
      _sum: {
        quantity: true,
      },
    });

    const result = await Promise.all(usage.map(async (entry) => {
      const item = await prisma.inventoryItem.findUnique({ where: { id: entry.itemId } });
      return {
        itemId: entry.itemId,
        name: item?.name,
        totalUsed: entry._sum.quantity,
        currentStock: item?.quantity,
      };
    }));

    res.json(result);
  } catch (error) {
    console.error("Error fetching inventory usage:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
