"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const authMiddleware_1 = require("../middleware/authMiddleware");
const pdfkit_1 = __importDefault(require("pdfkit"));
const date_fns_1 = require("date-fns");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// Create Customer
router.post("/customers", authMiddleware_1.authenticateToken, async (req, res) => {
    const { name, phone } = req.body;
    try {
        const customer = await prisma.customer.create({ data: { name, phone } });
        res.status(201).json(customer);
    }
    catch (error) {
        res.status(400).json({ error: "Phone number must be unique" });
    }
});
// Get Customers
router.get("/customers", authMiddleware_1.authenticateToken, async (req, res) => {
    const customers = await prisma.customer.findMany();
    res.json(customers);
});
// Record Sale
router.post("/sales", authMiddleware_1.authenticateToken, async (req, res) => {
    const { customerId, items, discount = 0, paidAmount, paymentType } = req.body;
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: "User not authenticated" });
    if (!items || items.length === 0)
        return res.status(400).json({ error: "Items are required" });
    // Validate payment type - only CASH or MPESA allowed
    if (!paymentType || !['CASH', 'MPESA'].includes(paymentType)) {
        return res.status(400).json({
            error: "Payment type must be either 'CASH' or 'MPESA'"
        });
    }
    try {
        // Use a transaction to ensure data consistency
        const result = await prisma.$transaction(async (tx) => {
            let totalAmount = 0;
            const saleItemsData = [];
            const inventoryUpdates = [];
            // First, validate all items and prepare data
            for (const item of items) {
                const inventory = await tx.inventoryItem.findUnique({
                    where: { id: item.itemId },
                });
                if (!inventory) {
                    throw new Error(`Item with ID ${item.itemId} not found`);
                }
                if (inventory.quantity < item.quantity) {
                    throw new Error(`Insufficient stock for item "${inventory.name}". Available: ${inventory.quantity}, Requested: ${item.quantity}`);
                }
                // Validate sale price against limit price
                if (inventory.limitPrice && item.price < inventory.limitPrice) {
                    throw new Error(`Sale price (${item.price}) for item "${inventory.name}" cannot be lower than the limit price (${inventory.limitPrice})`);
                }
                // Warn if sale price is significantly lower than default sell price
                if (inventory.sellPrice && item.price < inventory.sellPrice * 0.8) {
                    console.warn(`Warning: Sale price ${item.price} for item ${inventory.name} is significantly lower than default sell price ${inventory.sellPrice}`);
                }
                totalAmount += item.quantity * item.price;
                saleItemsData.push({
                    itemId: item.itemId,
                    quantity: item.quantity,
                    price: item.price,
                });
                // Store inventory update info
                inventoryUpdates.push({
                    itemId: item.itemId,
                    quantity: item.quantity,
                    currentStock: inventory.quantity,
                    newStock: inventory.quantity - item.quantity
                });
            }
            const netAmount = totalAmount - discount;
            // Create the sale
            const sale = await tx.sale.create({
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
            // Update inventory for all items
            for (const update of inventoryUpdates) {
                console.log(`Updating inventory for item ${update.itemId}: ${update.currentStock} -> ${update.newStock}`);
                const updatedItem = await tx.inventoryItem.update({
                    where: { id: update.itemId },
                    data: { quantity: update.newStock },
                });
                console.log(`Inventory updated successfully: ${updatedItem.name} now has ${updatedItem.quantity} in stock`);
                // Create transaction record
                await tx.inventoryTransaction.create({
                    data: {
                        itemId: update.itemId,
                        type: "STOCK_OUT",
                        quantity: update.quantity,
                    },
                });
            }
            // Create customer transaction
            const balance = paidAmount - netAmount;
            await tx.customerTransaction.create({
                data: {
                    customerId,
                    amount: balance,
                    reason: "Sale",
                    saleId: sale.id,
                },
            });
            return { sale, inventoryUpdates };
        });
        console.log('Sale completed successfully with inventory updates:', result.inventoryUpdates);
        res.status(201).json({ sale: result.sale, inventoryUpdates: result.inventoryUpdates });
    }
    catch (error) {
        console.error('Error creating sale:', error);
        const errorMessage = error instanceof Error ? error.message : "Failed to create sale";
        res.status(400).json({
            error: errorMessage,
            details: errorMessage
        });
    }
});
// Record Payment
router.post("/customers/:id/payments", authMiddleware_1.authenticateToken, async (req, res) => {
    const customerId = parseInt(req.params.id);
    const { amount, paymentType } = req.body;
    if (!amount || isNaN(amount))
        return res.status(400).json({ error: "Valid amount is required" });
    try {
        const allSales = await prisma.sale.findMany({
            where: { customerId },
            orderBy: { createdAt: "asc" },
        });
        const unpaidSales = allSales.filter(s => s.totalAmount > s.paidAmount);
        let remainingPayment = amount;
        for (const sale of unpaidSales) {
            const saleDue = sale.totalAmount - sale.paidAmount;
            if (saleDue <= 0)
                continue;
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
            if (remainingPayment <= 0)
                break;
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
    }
    catch (error) {
        console.error("Error recording payment:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
// Get Customer Transactions
router.get("/customers/:id/transactions", authMiddleware_1.authenticateToken, async (req, res) => {
    const customerId = parseInt(req.params.id);
    const transactions = await prisma.customerTransaction.findMany({
        where: { customerId },
        include: {
            sale: {
                include: {
                    items: {
                        include: {
                            item: true
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: "desc" },
    });
    const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const status = balance === 0 ? "Settled" : balance > 0 ? "Credit" : "Due";
    res.json({ balance, status, transactions });
});
// Get Receipt
router.get("/sales/:id/receipt", authMiddleware_1.authenticateToken, async (req, res) => {
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
    if (!sale)
        return res.status(404).json({ error: "Sale not found" });
    if (format === "pdf") {
        const doc = new pdfkit_1.default();
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
    }
    else {
        res.json(sale);
    }
});
// Sales Filter & Summary
router.get("/sales", authMiddleware_1.authenticateToken, async (req, res) => {
    let { start, end } = req.query;
    if (!start || isNaN(Date.parse(start)))
        start = (0, date_fns_1.subDays)(new Date(), 7).toISOString();
    if (!end || isNaN(Date.parse(end)))
        end = new Date().toISOString();
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
    }
    catch (error) {
        console.error("Failed to fetch sales:", error);
        res.status(500).json({ error: "Server error fetching sales" });
    }
});
router.get("/sales/filter", authMiddleware_1.authenticateToken, async (req, res) => {
    const { customerId, start, end } = req.query;
    const sales = await prisma.sale.findMany({
        where: {
            customerId: parseInt(customerId),
            createdAt: {
                gte: new Date(start),
                lte: new Date(end),
            },
        },
        include: {
            items: { include: { item: true } },
            customer: true,
            user: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "desc" },
    });
    res.json(sales);
});
router.get("/sales/report", authMiddleware_1.authenticateToken, async (req, res) => {
    const { range } = req.query;
    const now = new Date();
    let start;
    let end;
    switch (range) {
        case "weekly":
            start = (0, date_fns_1.startOfWeek)(now);
            end = (0, date_fns_1.endOfWeek)(now);
            break;
        case "monthly":
            start = (0, date_fns_1.startOfMonth)(now);
            end = (0, date_fns_1.endOfMonth)(now);
            break;
        case "yearly":
            start = (0, date_fns_1.startOfYear)(now);
            end = (0, date_fns_1.endOfYear)(now);
            break;
        default:
            start = (0, date_fns_1.startOfDay)(now);
            end = (0, date_fns_1.endOfDay)(now);
            break;
    }
    const sales = await prisma.sale.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { items: { include: { item: true } } },
    });
    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPaid = sales.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0);
    const itemSalesCount = {};
    for (const sale of sales) {
        for (const si of sale.items) {
            const id = si.itemId;
            const name = si.item.name;
            if (!itemSalesCount[id])
                itemSalesCount[id] = { name, quantity: 0 };
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
router.get("/reports/outstanding-balances", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({ include: { transactions: true } });
        const balances = customers.map((c) => {
            const balance = c.transactions.reduce((sum, tx) => sum + tx.amount, 0);
            return { customerId: c.id, name: c.name, balance };
        });
        res.json(balances.filter((c) => c.balance < 0));
    }
    catch (error) {
        console.error("Error fetching balances:", error);
        res.status(500).json({ error: "Server error" });
    }
});
router.get("/reports/top-products", authMiddleware_1.authenticateToken, async (req, res) => {
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : (0, date_fns_1.subDays)(new Date(), 7);
    const endDate = end ? new Date(end) : new Date();
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
        const withNames = await Promise.all(items.map(async (item) => {
            const itemInfo = await prisma.inventoryItem.findUnique({
                where: { id: item.itemId },
            });
            return {
                itemId: item.itemId,
                name: itemInfo?.name,
                quantitySold: item._sum.quantity,
            };
        }));
        res.json(withNames);
    }
    catch (error) {
        console.error("Top products error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
router.get("/reports/inventory-usage", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const usage = await prisma.saleItem.groupBy({
            by: ["itemId"],
            _sum: { quantity: true },
        });
        const result = await Promise.all(usage.map(async (entry) => {
            const item = await prisma.inventoryItem.findUnique({
                where: { id: entry.itemId },
            });
            return {
                itemId: entry.itemId,
                name: item?.name,
                totalUsed: entry._sum.quantity,
                currentStock: item?.quantity,
            };
        }));
        res.json(result);
    }
    catch (error) {
        console.error("Inventory usage error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
router.get("/reports/user-performance", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const userSales = await prisma.sale.groupBy({
            by: ["userId"],
            _sum: { totalAmount: true, paidAmount: true },
            _count: { _all: true },
        });
        const results = await Promise.all(userSales.map(async (entry) => {
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
        }));
        res.json(results);
    }
    catch (error) {
        console.error("User performance error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ NEW: Comprehensive Sales Report by Date Range
router.get("/reports/sales-by-date", authMiddleware_1.authenticateToken, async (req, res) => {
    const { start, end, groupBy = "day" } = req.query;
    const startDate = start ? new Date(start) : (0, date_fns_1.subDays)(new Date(), 30);
    const endDate = end ? new Date(end) : new Date();
    try {
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
            },
            include: {
                items: { include: { item: true } },
                customer: true,
                user: true,
            },
            orderBy: { createdAt: "asc" },
        });
        // Group sales by the specified time period
        const groupedSales = {};
        sales.forEach((sale) => {
            let key;
            const date = new Date(sale.createdAt);
            switch (groupBy) {
                case "day":
                    key = (0, date_fns_1.format)(date, "yyyy-MM-dd");
                    break;
                case "week":
                    key = (0, date_fns_1.format)(date, "yyyy-'W'ww");
                    break;
                case "month":
                    key = (0, date_fns_1.format)(date, "yyyy-MM");
                    break;
                case "year":
                    key = (0, date_fns_1.format)(date, "yyyy");
                    break;
                default:
                    key = (0, date_fns_1.format)(date, "yyyy-MM-dd");
            }
            if (!groupedSales[key]) {
                groupedSales[key] = {
                    period: key,
                    totalSales: 0,
                    totalPaid: 0,
                    totalDiscount: 0,
                    numberOfSales: 0,
                    items: {},
                    customers: new Set(),
                    paymentMethods: {},
                };
            }
            groupedSales[key].totalSales += sale.totalAmount;
            groupedSales[key].totalPaid += sale.paidAmount;
            groupedSales[key].totalDiscount += sale.discount;
            groupedSales[key].numberOfSales += 1;
            groupedSales[key].customers.add(sale.customer.name);
            // Count payment methods
            const paymentType = sale.paymentType;
            groupedSales[key].paymentMethods[paymentType] = (groupedSales[key].paymentMethods[paymentType] || 0) + 1;
            // Aggregate items sold
            sale.items.forEach((item) => {
                const itemKey = item.item.name;
                if (!groupedSales[key].items[itemKey]) {
                    groupedSales[key].items[itemKey] = {
                        name: item.item.name,
                        quantity: 0,
                        revenue: 0,
                        unit: item.item.unit,
                    };
                }
                groupedSales[key].items[itemKey].quantity += item.quantity;
                groupedSales[key].items[itemKey].revenue += item.quantity * item.price;
            });
        });
        // Convert to array and format
        const result = Object.values(groupedSales).map((group) => ({
            ...group,
            customers: Array.from(group.customers),
            uniqueCustomers: group.customers.size,
            outstandingAmount: group.totalSales - group.totalPaid,
            averageSaleValue: group.numberOfSales > 0 ? group.totalSales / group.numberOfSales : 0,
            items: Object.values(group.items),
        }));
        res.json(result);
    }
    catch (error) {
        console.error("Sales by date error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ NEW: Profit & Loss Report
router.get("/reports/profit-loss", authMiddleware_1.authenticateToken, async (req, res) => {
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : (0, date_fns_1.subDays)(new Date(), 30);
    const endDate = end ? new Date(end) : new Date();
    try {
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
            },
            include: {
                items: {
                    include: {
                        item: true
                    }
                },
            },
        });
        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;
        let totalDiscount = 0;
        const itemProfitability = {};
        sales.forEach((sale) => {
            totalRevenue += sale.totalAmount;
            totalDiscount += sale.discount;
            sale.items.forEach((saleItem) => {
                const item = saleItem.item;
                const itemKey = item.name;
                if (!itemProfitability[itemKey]) {
                    itemProfitability[itemKey] = {
                        name: item.name,
                        category: item.category,
                        totalQuantity: 0,
                        totalRevenue: 0,
                        totalCost: 0,
                        totalProfit: 0,
                        averagePrice: 0,
                        averageCost: 0,
                        profitMargin: 0,
                    };
                }
                const revenue = saleItem.quantity * saleItem.price;
                const cost = saleItem.quantity * (item.basePrice || 0);
                const profit = revenue - cost;
                itemProfitability[itemKey].totalQuantity += saleItem.quantity;
                itemProfitability[itemKey].totalRevenue += revenue;
                itemProfitability[itemKey].totalCost += cost;
                itemProfitability[itemKey].totalProfit += profit;
            });
        });
        // Calculate totals and averages for each item
        Object.values(itemProfitability).forEach((item) => {
            item.averagePrice = item.totalQuantity > 0 ? item.totalRevenue / item.totalQuantity : 0;
            item.averageCost = item.totalQuantity > 0 ? item.totalCost / item.totalQuantity : 0;
            item.profitMargin = item.totalRevenue > 0 ? (item.totalProfit / item.totalRevenue) * 100 : 0;
            totalCost += item.totalCost;
            totalProfit += item.totalProfit;
        });
        // Sort items by profitability
        const sortedItems = Object.values(itemProfitability).sort((a, b) => b.totalProfit - a.totalProfit);
        const result = {
            period: { start: startDate, end: endDate },
            summary: {
                totalRevenue,
                totalCost,
                totalProfit,
                totalDiscount,
                netProfit: totalProfit - totalDiscount,
                profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
                numberOfSales: sales.length,
            },
            topPerformers: sortedItems.slice(0, 10),
            leastProfitable: sortedItems.slice(-10).reverse(),
            categoryBreakdown: (() => {
                const categories = {};
                sortedItems.forEach((item) => {
                    if (!categories[item.category]) {
                        categories[item.category] = {
                            name: item.category,
                            totalRevenue: 0,
                            totalCost: 0,
                            totalProfit: 0,
                            itemCount: 0,
                        };
                    }
                    categories[item.category].totalRevenue += item.totalRevenue;
                    categories[item.category].totalCost += item.totalCost;
                    categories[item.category].totalProfit += item.totalProfit;
                    categories[item.category].itemCount += 1;
                });
                return Object.values(categories).sort((a, b) => b.totalProfit - a.totalProfit);
            })(),
        };
        res.json(result);
    }
    catch (error) {
        console.error("Profit & Loss error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ NEW: Inventory Valuation Report
router.get("/reports/inventory-valuation", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const inventory = await prisma.inventoryItem.findMany({
            include: {
                saleItems: {
                    include: {
                        sale: true,
                    },
                },
            },
        });
        const result = inventory.map((item) => {
            // Calculate current value
            const currentValue = item.quantity * (item.basePrice || 0);
            const potentialValue = item.quantity * (item.sellPrice || 0);
            // Calculate sales velocity (items sold per day in last 30 days)
            const thirtyDaysAgo = (0, date_fns_1.subDays)(new Date(), 30);
            const recentSales = item.saleItems.filter((saleItem) => saleItem.sale.createdAt >= thirtyDaysAgo);
            const quantitySold = recentSales.reduce((sum, si) => sum + si.quantity, 0);
            const salesVelocity = quantitySold / 30; // per day
            // Calculate days until stockout
            const daysUntilStockout = salesVelocity > 0 ? item.quantity / salesVelocity : null;
            // Calculate turnover rate
            const totalSold = item.saleItems.reduce((sum, si) => sum + si.quantity, 0);
            const turnoverRate = item.quantity > 0 ? totalSold / item.quantity : 0;
            return {
                id: item.id,
                name: item.name,
                category: item.category,
                subtype: item.subtype,
                currentStock: item.quantity,
                unit: item.unit,
                basePrice: item.basePrice,
                sellPrice: item.sellPrice,
                limitPrice: item.limitPrice,
                currentValue,
                potentialValue,
                profitPotential: potentialValue - currentValue,
                profitMargin: item.basePrice && item.sellPrice ?
                    ((item.sellPrice - item.basePrice) / item.sellPrice) * 100 : 0,
                lowStockAlert: item.quantity <= item.lowStockLimit,
                salesVelocity,
                daysUntilStockout,
                turnoverRate,
                totalSold,
                lastUpdated: item.updatedAt,
            };
        });
        // Calculate summary statistics
        const summary = {
            totalItems: result.length,
            totalValue: result.reduce((sum, item) => sum + item.currentValue, 0),
            totalPotentialValue: result.reduce((sum, item) => sum + item.potentialValue, 0),
            totalProfitPotential: result.reduce((sum, item) => sum + item.profitPotential, 0),
            lowStockItems: result.filter(item => item.lowStockAlert).length,
            outOfStockItems: result.filter(item => item.currentStock === 0).length,
            highValueItems: result.filter(item => item.currentValue > 10000).length, // Items worth more than 10K
        };
        res.json({ summary, items: result });
    }
    catch (error) {
        console.error("Inventory valuation error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ NEW: Customer Analysis Report
router.get("/reports/customer-analysis", authMiddleware_1.authenticateToken, async (req, res) => {
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : (0, date_fns_1.subDays)(new Date(), 90);
    const endDate = end ? new Date(end) : new Date();
    try {
        const customers = await prisma.customer.findMany({
            include: {
                sales: {
                    where: {
                        createdAt: { gte: startDate, lte: endDate },
                    },
                    include: {
                        items: true,
                    },
                },
                transactions: true,
            },
        });
        const customerAnalysis = customers.map((customer) => {
            const totalSpent = customer.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const totalPaid = customer.sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
            const totalDiscount = customer.sales.reduce((sum, sale) => sum + sale.discount, 0);
            const outstandingBalance = customer.transactions.reduce((sum, tx) => sum + tx.amount, 0);
            // Calculate average order value
            const averageOrderValue = customer.sales.length > 0 ? totalSpent / customer.sales.length : 0;
            // Calculate customer lifetime value (all time)
            const lifetimeValue = customer.transactions.reduce((sum, tx) => sum + tx.amount, 0);
            // Determine customer segment
            let segment = "Bronze";
            if (totalSpent >= 50000)
                segment = "Gold";
            else if (totalSpent >= 20000)
                segment = "Silver";
            else if (totalSpent >= 5000)
                segment = "Bronze";
            else
                segment = "New";
            return {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                totalSpent,
                totalPaid,
                totalDiscount,
                outstandingBalance,
                averageOrderValue,
                lifetimeValue,
                numberOfOrders: customer.sales.length,
                lastOrderDate: customer.sales.length > 0 ?
                    Math.max(...customer.sales.map(s => s.createdAt.getTime())) : null,
                segment,
                paymentHistory: customer.transactions.length,
                isActive: customer.sales.length > 0,
            };
        });
        // Sort by total spent
        customerAnalysis.sort((a, b) => b.totalSpent - a.totalSpent);
        // Calculate summary statistics
        const summary = {
            totalCustomers: customerAnalysis.length,
            activeCustomers: customerAnalysis.filter(c => c.isActive).length,
            totalRevenue: customerAnalysis.reduce((sum, c) => sum + c.totalSpent, 0),
            totalOutstanding: customerAnalysis.reduce((sum, c) => sum + Math.abs(c.outstandingBalance), 0),
            averageCustomerValue: customerAnalysis.length > 0 ?
                customerAnalysis.reduce((sum, c) => sum + c.totalSpent, 0) / customerAnalysis.length : 0,
            segmentBreakdown: {
                Gold: customerAnalysis.filter(c => c.segment === "Gold").length,
                Silver: customerAnalysis.filter(c => c.segment === "Silver").length,
                Bronze: customerAnalysis.filter(c => c.segment === "Bronze").length,
                New: customerAnalysis.filter(c => c.segment === "New").length,
            },
        };
        res.json({ summary, customers: customerAnalysis });
    }
    catch (error) {
        console.error("Customer analysis error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ NEW: Enhanced Sales Report with Custom Date Range
router.get("/reports/enhanced-sales", authMiddleware_1.authenticateToken, async (req, res) => {
    const { start, end, groupBy = "day" } = req.query;
    const startDate = start ? new Date(start) : (0, date_fns_1.subDays)(new Date(), 7);
    const endDate = end ? new Date(end) : new Date();
    try {
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
            },
            include: {
                items: {
                    include: {
                        item: true
                    }
                },
                customer: true,
                user: true,
            },
            orderBy: { createdAt: "desc" },
        });
        // Calculate comprehensive metrics
        const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalPaid = sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
        const totalDiscount = sales.reduce((sum, sale) => sum + sale.discount, 0);
        const totalCost = sales.reduce((sum, sale) => {
            return sum + sale.items.reduce((itemSum, item) => {
                return itemSum + (item.quantity * (item.item.basePrice || 0));
            }, 0);
        }, 0);
        // Payment method breakdown
        const paymentMethods = {};
        sales.forEach((sale) => {
            const method = sale.paymentType;
            if (!paymentMethods[method]) {
                paymentMethods[method] = { count: 0, total: 0 };
            }
            paymentMethods[method].count += 1;
            paymentMethods[method].total += sale.totalAmount;
        });
        // Top selling items
        const itemSales = {};
        sales.forEach((sale) => {
            sale.items.forEach((item) => {
                const itemKey = item.item.name;
                if (!itemSales[itemKey]) {
                    itemSales[itemKey] = {
                        name: item.item.name,
                        quantity: 0,
                        revenue: 0,
                        cost: 0,
                    };
                }
                itemSales[itemKey].quantity += item.quantity;
                itemSales[itemKey].revenue += item.quantity * item.price;
                itemSales[itemKey].cost += item.quantity * (item.item.basePrice || 0);
            });
        });
        const topItems = Object.values(itemSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        // Customer analysis
        const customerSales = {};
        sales.forEach((sale) => {
            const customerKey = sale.customer.name;
            if (!customerSales[customerKey]) {
                customerSales[customerKey] = {
                    name: customerKey,
                    orders: 0,
                    total: 0,
                };
            }
            customerSales[customerKey].orders += 1;
            customerSales[customerKey].total += sale.totalAmount;
        });
        const topCustomers = Object.values(customerSales)
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
        const result = {
            period: { start: startDate, end: endDate },
            summary: {
                totalSales,
                totalPaid,
                totalDiscount,
                totalCost,
                grossProfit: totalSales - totalCost,
                netProfit: (totalSales - totalCost) - totalDiscount,
                profitMargin: totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0,
                numberOfSales: sales.length,
                averageOrderValue: sales.length > 0 ? totalSales / sales.length : 0,
                collectionRate: totalSales > 0 ? (totalPaid / totalSales) * 100 : 0,
            },
            paymentMethods: Object.entries(paymentMethods).map(([method, data]) => ({
                method,
                count: data.count,
                total: data.total,
                percentage: totalSales > 0 ? (data.total / totalSales) * 100 : 0,
            })),
            topItems,
            topCustomers,
            salesByDate: (() => {
                const dailySales = {};
                sales.forEach((sale) => {
                    const dateKey = (0, date_fns_1.format)(sale.createdAt, "yyyy-MM-dd");
                    if (!dailySales[dateKey]) {
                        dailySales[dateKey] = { date: dateKey, sales: 0, orders: 0 };
                    }
                    dailySales[dateKey].sales += sale.totalAmount;
                    dailySales[dateKey].orders += 1;
                });
                return Object.values(dailySales).sort((a, b) => a.date.localeCompare(b.date));
            })(),
        };
        res.json(result);
    }
    catch (error) {
        console.error("Enhanced sales report error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ NEW: Daily/Weekly/Monthly/Yearly Sales Reports with Specific Date Selection
router.get("/reports/sales-by-period", authMiddleware_1.authenticateToken, async (req, res) => {
    const { period, start, end, customStart, customEnd } = req.query;
    let startDate;
    let endDate;
    const now = new Date();
    try {
        if (period === 'custom' && customStart && customEnd) {
            startDate = new Date(customStart);
            endDate = new Date(customEnd);
        }
        else {
            switch (period) {
                case 'day':
                    startDate = start ? new Date(start) : (0, date_fns_1.startOfDay)(now);
                    endDate = end ? new Date(end) : (0, date_fns_1.endOfDay)(now);
                    break;
                case 'week':
                    startDate = start ? new Date(start) : (0, date_fns_1.startOfWeek)(now);
                    endDate = end ? new Date(end) : (0, date_fns_1.endOfWeek)(now);
                    break;
                case 'month':
                    startDate = start ? new Date(start) : (0, date_fns_1.startOfMonth)(now);
                    endDate = end ? new Date(end) : (0, date_fns_1.endOfMonth)(now);
                    break;
                case 'year':
                    startDate = start ? new Date(start) : (0, date_fns_1.startOfYear)(now);
                    endDate = end ? new Date(end) : (0, date_fns_1.endOfYear)(now);
                    break;
                default:
                    startDate = (0, date_fns_1.startOfDay)(now);
                    endDate = (0, date_fns_1.endOfDay)(now);
            }
        }
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
            },
            include: {
                items: {
                    include: {
                        item: true
                    }
                },
                customer: true,
                user: true,
            },
            orderBy: { createdAt: "desc" },
        });
        // Calculate comprehensive metrics
        const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalPaid = sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
        const totalDiscount = sales.reduce((sum, sale) => sum + sale.discount, 0);
        const totalCost = sales.reduce((sum, sale) => {
            return sum + sale.items.reduce((itemSum, item) => {
                return itemSum + (item.quantity * (item.item.basePrice || 0));
            }, 0);
        }, 0);
        // Sales by hour analysis
        const salesByHour = {};
        for (let i = 0; i < 24; i++) {
            salesByHour[i] = { sales: 0, orders: 0 };
        }
        sales.forEach((sale) => {
            const hour = new Date(sale.createdAt).getHours();
            salesByHour[hour].sales += sale.totalAmount;
            salesByHour[hour].orders += 1;
        });
        // Sales by day of week
        const salesByDay = {};
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        dayNames.forEach(day => {
            salesByDay[day] = { sales: 0, orders: 0 };
        });
        sales.forEach((sale) => {
            const day = dayNames[new Date(sale.createdAt).getDay()];
            salesByDay[day].sales += sale.totalAmount;
            salesByDay[day].orders += 1;
        });
        // Top performing items
        const itemPerformance = {};
        sales.forEach((sale) => {
            sale.items.forEach((item) => {
                const itemKey = item.item.name;
                if (!itemPerformance[itemKey]) {
                    itemPerformance[itemKey] = {
                        name: item.item.name,
                        quantity: 0,
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                    };
                }
                const revenue = item.quantity * item.price;
                const cost = item.quantity * (item.item.basePrice || 0);
                itemPerformance[itemKey].quantity += item.quantity;
                itemPerformance[itemKey].revenue += revenue;
                itemPerformance[itemKey].cost += cost;
                itemPerformance[itemKey].profit += revenue - cost;
            });
        });
        const topItems = Object.values(itemPerformance)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        const result = {
            period: { start: startDate, end: endDate, type: period },
            summary: {
                totalSales,
                totalPaid,
                totalDiscount,
                totalCost,
                grossProfit: totalSales - totalCost,
                netProfit: (totalSales - totalCost) - totalDiscount,
                profitMargin: totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0,
                numberOfSales: sales.length,
                averageOrderValue: sales.length > 0 ? totalSales / sales.length : 0,
                collectionRate: totalSales > 0 ? (totalPaid / totalSales) * 100 : 0,
                outstandingAmount: totalSales - totalPaid,
            },
            salesByHour: Object.entries(salesByHour).map(([hour, data]) => ({
                hour: parseInt(hour),
                sales: data.sales,
                orders: data.orders,
            })),
            salesByDay: Object.entries(salesByDay).map(([day, data]) => ({
                day,
                sales: data.sales,
                orders: data.orders,
            })),
            topItems,
            recentSales: sales.slice(0, 20).map(sale => ({
                id: sale.id,
                customer: sale.customer.name,
                amount: sale.totalAmount,
                paid: sale.paidAmount,
                discount: sale.discount,
                paymentType: sale.paymentType,
                date: sale.createdAt,
                items: sale.items.map(item => ({
                    name: item.item.name,
                    quantity: item.quantity,
                    price: item.price,
                })),
            })),
        };
        res.json(result);
    }
    catch (error) {
        console.error("Sales by period report error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ NEW: Loss Report - Items expiring, low stock, waste analysis
router.get("/reports/loss-analysis", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const inventory = await prisma.inventoryItem.findMany({
            include: {
                saleItems: {
                    include: {
                        sale: true,
                    },
                },
            },
        });
        const now = new Date();
        const thirtyDaysAgo = (0, date_fns_1.subDays)(now, 30);
        const sixtyDaysAgo = (0, date_fns_1.subDays)(now, 60);
        const lossAnalysis = inventory.map((item) => {
            // Calculate potential losses
            const currentValue = item.quantity * (item.basePrice || 0);
            const potentialLoss = item.quantity * (item.basePrice || 0);
            // Calculate waste potential (items not sold in 30 days)
            const recentSales = item.saleItems.filter((saleItem) => saleItem.sale.createdAt >= thirtyDaysAgo);
            const quantitySold = recentSales.reduce((sum, si) => sum + si.quantity, 0);
            const wasteRisk = item.quantity - quantitySold;
            // Calculate expiry risk (items with low turnover)
            const totalSold = item.saleItems.reduce((sum, si) => sum + si.quantity, 0);
            const turnoverRate = item.quantity > 0 ? totalSold / item.quantity : 0;
            const expiryRisk = turnoverRate < 0.1; // Less than 10% turnover
            // Calculate low stock risk
            const lowStockRisk = item.quantity <= item.lowStockLimit;
            // Calculate overstock risk
            const overstockRisk = item.quantity > (item.lowStockLimit * 3); // More than 3x low stock limit
            return {
                id: item.id,
                name: item.name,
                category: item.category,
                currentStock: item.quantity,
                unit: item.unit,
                basePrice: item.basePrice,
                currentValue,
                potentialLoss,
                wasteRisk: Math.max(0, wasteRisk),
                expiryRisk,
                lowStockRisk,
                overstockRisk,
                turnoverRate: turnoverRate * 100, // Convert to percentage
                lastSold: item.saleItems.length > 0 ?
                    Math.max(...item.saleItems.map(si => si.sale.createdAt.getTime())) : null,
                daysSinceLastSale: item.saleItems.length > 0 ?
                    Math.floor((now.getTime() - Math.max(...item.saleItems.map(si => si.sale.createdAt.getTime()))) / (1000 * 60 * 60 * 24)) : null,
                recommendations: [
                    ...(wasteRisk > 0 ? [`Reduce price to clear ${wasteRisk} ${item.unit} of ${item.name}`] : []),
                    ...(expiryRisk ? [`High expiry risk - consider promotions for ${item.name}`] : []),
                    ...(lowStockRisk ? [`Low stock alert for ${item.name}`] : []),
                    ...(overstockRisk ? [`Overstocked - reduce ordering for ${item.name}`] : []),
                ],
            };
        });
        // Calculate summary statistics
        const summary = {
            totalItems: lossAnalysis.length,
            totalValue: lossAnalysis.reduce((sum, item) => sum + item.currentValue, 0),
            totalPotentialLoss: lossAnalysis.reduce((sum, item) => sum + item.potentialLoss, 0),
            highRiskItems: lossAnalysis.filter(item => item.wasteRisk > 0 || item.expiryRisk || item.lowStockRisk).length,
            wasteRiskItems: lossAnalysis.filter(item => item.wasteRisk > 0).length,
            expiryRiskItems: lossAnalysis.filter(item => item.expiryRisk).length,
            lowStockItems: lossAnalysis.filter(item => item.lowStockRisk).length,
            overstockItems: lossAnalysis.filter(item => item.overstockRisk).length,
        };
        // Sort by risk level
        const sortedByRisk = lossAnalysis.sort((a, b) => {
            const aRisk = (a.wasteRisk > 0 ? 3 : 0) + (a.expiryRisk ? 2 : 0) + (a.lowStockRisk ? 1 : 0);
            const bRisk = (b.wasteRisk > 0 ? 3 : 0) + (b.expiryRisk ? 2 : 0) + (b.lowStockRisk ? 1 : 0);
            return bRisk - aRisk;
        });
        res.json({
            summary,
            items: sortedByRisk,
            riskCategories: {
                waste: sortedByRisk.filter(item => item.wasteRisk > 0),
                expiry: sortedByRisk.filter(item => item.expiryRisk),
                lowStock: sortedByRisk.filter(item => item.lowStockRisk),
                overstock: sortedByRisk.filter(item => item.overstockRisk),
            }
        });
    }
    catch (error) {
        console.error("Loss analysis error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ NEW: Enhanced Inventory Report with Stock Movement Analysis
router.get("/reports/enhanced-inventory", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const inventory = await prisma.inventoryItem.findMany({
            include: {
                saleItems: {
                    include: {
                        sale: true,
                    },
                },
            },
        });
        const now = new Date();
        const thirtyDaysAgo = (0, date_fns_1.subDays)(now, 30);
        const ninetyDaysAgo = (0, date_fns_1.subDays)(now, 90);
        const enhancedInventory = inventory.map((item) => {
            // Calculate stock movement
            const recentSales = item.saleItems.filter((saleItem) => saleItem.sale.createdAt >= thirtyDaysAgo);
            const olderSales = item.saleItems.filter((saleItem) => saleItem.sale.createdAt >= ninetyDaysAgo && saleItem.sale.createdAt < thirtyDaysAgo);
            const recentQuantity = recentSales.reduce((sum, si) => sum + si.quantity, 0);
            const olderQuantity = olderSales.reduce((sum, si) => sum + si.quantity, 0);
            // Calculate trends
            const recentVelocity = recentQuantity / 30; // per day
            const olderVelocity = olderQuantity / 60; // per day
            const velocityChange = olderVelocity > 0 ? ((recentVelocity - olderVelocity) / olderVelocity) * 100 : 0;
            // Calculate stock health
            const stockHealth = (() => {
                if (item.quantity === 0)
                    return 'out_of_stock';
                if (item.quantity <= item.lowStockLimit)
                    return 'low_stock';
                if (item.quantity > item.lowStockLimit * 3)
                    return 'overstocked';
                return 'healthy';
            })();
            // Calculate reorder recommendations
            const daysUntilReorder = recentVelocity > 0 ?
                Math.max(0, (item.lowStockLimit - item.quantity) / recentVelocity) : null;
            const recommendedOrderQuantity = recentVelocity > 0 ?
                Math.ceil(recentVelocity * 30) : item.lowStockLimit; // 30 days supply
            return {
                id: item.id,
                name: item.name,
                category: item.category,
                subtype: item.subtype,
                currentStock: item.quantity,
                unit: item.unit,
                basePrice: item.basePrice,
                sellPrice: item.sellPrice,
                lowStockLimit: item.lowStockLimit,
                currentValue: item.quantity * (item.basePrice || 0),
                potentialValue: item.quantity * (item.sellPrice || 0),
                profitMargin: item.basePrice && item.sellPrice ?
                    ((item.sellPrice - item.basePrice) / item.sellPrice) * 100 : 0,
                stockHealth,
                recentVelocity,
                velocityChange,
                daysUntilReorder,
                recommendedOrderQuantity,
                lastUpdated: item.updatedAt,
                totalSold: item.saleItems.reduce((sum, si) => sum + si.quantity, 0),
                lastSold: item.saleItems.length > 0 ?
                    Math.max(...item.saleItems.map(si => si.sale.createdAt.getTime())) : null,
            };
        });
        // Calculate summary statistics
        const summary = {
            totalItems: enhancedInventory.length,
            totalValue: enhancedInventory.reduce((sum, item) => sum + item.currentValue, 0),
            totalPotentialValue: enhancedInventory.reduce((sum, item) => sum + item.potentialValue, 0),
            stockHealthBreakdown: {
                healthy: enhancedInventory.filter(item => item.stockHealth === 'healthy').length,
                lowStock: enhancedInventory.filter(item => item.stockHealth === 'low_stock').length,
                overstocked: enhancedInventory.filter(item => item.stockHealth === 'overstocked').length,
                outOfStock: enhancedInventory.filter(item => item.stockHealth === 'out_of_stock').length,
            },
            itemsNeedingReorder: enhancedInventory.filter(item => item.daysUntilReorder !== null && item.daysUntilReorder <= 7).length,
            highValueItems: enhancedInventory.filter(item => item.currentValue > 10000).length,
            trendingUp: enhancedInventory.filter(item => item.velocityChange > 10).length,
            trendingDown: enhancedInventory.filter(item => item.velocityChange < -10).length,
        };
        res.json({ summary, items: enhancedInventory });
    }
    catch (error) {
        console.error("Enhanced inventory report error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ NEW: Cash Flow Report
router.get("/reports/cash-flow", authMiddleware_1.authenticateToken, async (req, res) => {
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : (0, date_fns_1.subDays)(new Date(), 30);
    const endDate = end ? new Date(end) : new Date();
    try {
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
            },
            include: {
                items: {
                    include: {
                        item: true
                    }
                },
            },
        });
        // Calculate cash flow metrics
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalCollected = sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
        const totalOutstanding = totalRevenue - totalCollected;
        const totalDiscounts = sales.reduce((sum, sale) => sum + sale.discount, 0);
        // Calculate cost of goods sold
        const totalCost = sales.reduce((sum, sale) => {
            return sum + sale.items.reduce((itemSum, item) => {
                return itemSum + (item.quantity * (item.item.basePrice || 0));
            }, 0);
        }, 0);
        // Payment method analysis
        const paymentMethods = {};
        sales.forEach((sale) => {
            const method = sale.paymentType;
            if (!paymentMethods[method]) {
                paymentMethods[method] = { count: 0, total: 0, collected: 0 };
            }
            paymentMethods[method].count += 1;
            paymentMethods[method].total += sale.totalAmount;
            paymentMethods[method].collected += sale.paidAmount;
        });
        // Daily cash flow
        const dailyCashFlow = {};
        sales.forEach((sale) => {
            const dateKey = (0, date_fns_1.format)(sale.createdAt, "yyyy-MM-dd");
            if (!dailyCashFlow[dateKey]) {
                dailyCashFlow[dateKey] = { revenue: 0, collected: 0, outstanding: 0 };
            }
            dailyCashFlow[dateKey].revenue += sale.totalAmount;
            dailyCashFlow[dateKey].collected += sale.paidAmount;
            dailyCashFlow[dateKey].outstanding += (sale.totalAmount - sale.paidAmount);
        });
        const result = {
            period: { start: startDate, end: endDate },
            summary: {
                totalRevenue,
                totalCollected,
                totalOutstanding,
                totalDiscounts,
                totalCost,
                grossProfit: totalRevenue - totalCost,
                netProfit: (totalRevenue - totalCost) - totalDiscounts,
                collectionRate: totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0,
                outstandingRate: totalRevenue > 0 ? (totalOutstanding / totalRevenue) * 100 : 0,
            },
            paymentMethods: Object.entries(paymentMethods).map(([method, data]) => ({
                method,
                count: data.count,
                total: data.total,
                collected: data.collected,
                outstanding: data.total - data.collected,
                collectionRate: data.total > 0 ? (data.collected / data.total) * 100 : 0,
            })),
            dailyCashFlow: Object.entries(dailyCashFlow)
                .map(([date, data]) => ({
                date,
                revenue: data.revenue,
                collected: data.collected,
                outstanding: data.outstanding,
            }))
                .sort((a, b) => a.date.localeCompare(b.date)),
        };
        res.json(result);
    }
    catch (error) {
        console.error("Cash flow report error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// Debug endpoint to check inventory status
router.get("/debug/inventory/:itemId", async (req, res) => {
    try {
        const itemId = parseInt(req.params.itemId);
        const item = await prisma.inventoryItem.findUnique({
            where: { id: itemId },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });
        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }
        res.json({
            item,
            recentTransactions: item.transactions
        });
    }
    catch (error) {
        console.error('Error fetching inventory debug info:', error);
        res.status(500).json({ error: "Failed to fetch inventory info" });
    }
});
// Debug endpoint to list all inventory items
router.get("/debug/inventory", async (req, res) => {
    try {
        const items = await prisma.inventoryItem.findMany({
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json({
            totalItems: items.length,
            items: items.map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                basePrice: item.basePrice,
                sellPrice: item.sellPrice,
                limitPrice: item.limitPrice,
                lowStockLimit: item.lowStockLimit,
                lastUpdated: item.updatedAt,
                recentTransactions: item.transactions.length
            }))
        });
    }
    catch (error) {
        console.error('Error fetching inventory list:', error);
        res.status(500).json({ error: "Failed to fetch inventory list" });
    }
});
// Test endpoint for inventory updates (remove in production)
router.post("/test-sale", async (req, res) => {
    const { customerId, items, discount = 0, paidAmount, paymentType } = req.body;
    if (!items || items.length === 0) {
        return res.status(400).json({ error: "Items are required" });
    }
    try {
        console.log('Test sale request:', { customerId, items, discount, paidAmount, paymentType });
        // Use a transaction to ensure data consistency
        const result = await prisma.$transaction(async (tx) => {
            let totalAmount = 0;
            const saleItemsData = [];
            const inventoryUpdates = [];
            // First, validate all items and prepare data
            for (const item of items) {
                const inventory = await tx.inventoryItem.findUnique({
                    where: { id: item.itemId },
                });
                if (!inventory) {
                    throw new Error(`Item with ID ${item.itemId} not found`);
                }
                console.log(`Item ${inventory.name}: current stock = ${inventory.quantity}, requested = ${item.quantity}`);
                if (inventory.quantity < item.quantity) {
                    throw new Error(`Insufficient stock for item "${inventory.name}". Available: ${inventory.quantity}, Requested: ${item.quantity}`);
                }
                totalAmount += item.quantity * item.price;
                saleItemsData.push({
                    itemId: item.itemId,
                    quantity: item.quantity,
                    price: item.price,
                });
                // Store inventory update info
                inventoryUpdates.push({
                    itemId: item.itemId,
                    quantity: item.quantity,
                    currentStock: inventory.quantity,
                    newStock: inventory.quantity - item.quantity
                });
            }
            const netAmount = totalAmount - discount;
            // Create the sale
            const sale = await tx.sale.create({
                data: {
                    customerId: customerId || 1, // Default customer if not provided
                    userId: 1, // Default user
                    totalAmount: netAmount,
                    discount,
                    paidAmount: paidAmount !== undefined ? paidAmount : netAmount,
                    paymentType: paymentType || 'CASH',
                    items: { create: saleItemsData },
                },
                include: { customer: true, user: true },
            });
            console.log('Sale created:', sale.id);
            // Update inventory for all items
            for (const update of inventoryUpdates) {
                console.log(`Updating inventory for item ${update.itemId}: ${update.currentStock} -> ${update.newStock}`);
                const updatedItem = await tx.inventoryItem.update({
                    where: { id: update.itemId },
                    data: { quantity: update.newStock },
                });
                console.log(`Inventory updated successfully: ${updatedItem.name} now has ${updatedItem.quantity} in stock`);
                // Create transaction record
                await tx.inventoryTransaction.create({
                    data: {
                        itemId: update.itemId,
                        type: "STOCK_OUT",
                        quantity: update.quantity,
                    },
                });
            }
            return { sale, inventoryUpdates };
        });
        console.log('Test sale completed successfully with inventory updates:', result.inventoryUpdates);
        res.status(201).json({
            success: true,
            sale: result.sale,
            inventoryUpdates: result.inventoryUpdates
        });
    }
    catch (error) {
        console.error('Error in test sale:', error);
        const errorMessage = error instanceof Error ? error.message : "Failed to create test sale";
        res.status(400).json({
            success: false,
            error: errorMessage,
            details: errorMessage
        });
    }
});
exports.default = router;
