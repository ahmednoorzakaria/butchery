"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const authMiddleware_1 = require("../middleware/authMiddleware");
const date_fns_1 = require("date-fns");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// ✅ 1. GET /reports/outstanding-balances
router.get("/outstanding-balances", authMiddleware_1.authenticateToken, async (req, res) => {
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
        const withNegativeBalance = balances.filter((c) => c.balance < 0);
        res.json(withNegativeBalance);
    }
    catch (error) {
        console.error("Error fetching outstanding balances:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ 2. GET /reports/top-products
router.get("/top-products", authMiddleware_1.authenticateToken, async (req, res) => {
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : (0, date_fns_1.subDays)(new Date(), 7);
    const endDate = end ? new Date(end) : new Date();
    try {
        const items = await prisma.saleItem.groupBy({
            by: ["itemId"],
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
                    quantity: "desc",
                },
            },
            take: 10, // return top 10
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
        console.error("Error fetching top products:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ 3. GET /reports/inventory-usage
router.get("/inventory-usage", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const usage = await prisma.saleItem.groupBy({
            by: ["itemId"],
            _sum: {
                quantity: true,
            },
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
        console.error("Error fetching inventory usage:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ 4. GET /reports/user-performance
router.get("/user-performance", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        // Group sales by userId and sum totalAmount
        const userSales = await prisma.sale.groupBy({
            by: ["userId"],
            _sum: {
                totalAmount: true,
                paidAmount: true,
            },
            _count: {
                _all: true,
            },
        });
        // Attach user details (name/email)
        const results = await Promise.all(userSales.map(async (entry) => {
            const user = entry.userId
                ? await prisma.user.findUnique({
                    where: { id: entry.userId },
                })
                : null;
            return {
                userId: entry.userId,
                name: user?.name || "Unknown", // fallback for null
                email: user?.email || "N/A",
                totalSales: entry._sum.totalAmount || 0,
                totalPaid: entry._sum.paidAmount || 0,
                saleCount: entry._count._all,
            };
        }));
        res.json(results);
    }
    catch (error) {
        console.error("Error fetching user sales performance:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ 5. GET /reports/sales-by-period
router.get("/sales-by-period", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { period, start, end } = req.query;
        let startDate, endDate;
        if (start && end) {
            startDate = new Date(start);
            endDate = new Date(end);
        }
        else {
            const now = new Date();
            switch (period) {
                case 'day':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                    break;
                case 'week':
                    startDate = new Date(now.setDate(now.getDate() - now.getDay()));
                    endDate = new Date(now.setDate(now.getDate() - now.getDay() + 6));
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    endDate = new Date(now.getFullYear(), 11, 31);
                    break;
                default:
                    startDate = new Date(now.setDate(now.getDate() - 7));
                    endDate = now;
            }
        }
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                customer: true,
                items: {
                    include: {
                        item: true,
                    },
                },
            },
        });
        // Calculate summary
        const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalPaid = sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
        const outstandingAmount = totalSales - totalPaid;
        const numberOfSales = sales.length;
        // Calculate actual profit based on item costs
        let totalCost = 0;
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const itemCost = item.item.basePrice || item.price * 0.7;
                totalCost += item.quantity * itemCost;
            });
        });
        const netProfit = totalSales - totalCost;
        const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
        const collectionRate = totalSales > 0 ? (totalPaid / totalSales) * 100 : 0;
        // Sales by hour
        const salesByHour = Array.from({ length: 24 }, (_, hour) => {
            const hourSales = sales.filter(sale => {
                const saleHour = new Date(sale.createdAt).getHours();
                return saleHour === hour;
            });
            return {
                hour: `${hour}:00`,
                sales: hourSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
            };
        });
        // Sales by day of week
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const salesByDay = daysOfWeek.map((day, index) => {
            const daySales = sales.filter(sale => {
                const saleDay = new Date(sale.createdAt).getDay();
                return saleDay === index;
            });
            return {
                day,
                sales: daySales.reduce((sum, sale) => sum + sale.totalAmount, 0),
            };
        });
        // Top items
        const itemSales = {};
        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (!itemSales[item.item.name]) {
                    itemSales[item.item.name] = { quantity: 0, revenue: 0, profit: 0, cost: 0 };
                }
                const itemCost = item.item.basePrice || item.price * 0.7;
                itemSales[item.item.name].quantity += item.quantity;
                itemSales[item.item.name].revenue += item.quantity * item.price;
                itemSales[item.item.name].cost += item.quantity * itemCost;
                itemSales[item.item.name].profit += item.quantity * (item.price - itemCost);
            });
        });
        const topItems = Object.entries(itemSales)
            .map(([name, data]) => ({
            name,
            quantity: data.quantity,
            revenue: data.revenue,
            cost: data.cost,
            profit: data.profit,
        }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        // Recent sales
        const recentSales = sales
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10)
            .map(sale => ({
            id: sale.id,
            customer: sale.customer.name,
            amount: sale.totalAmount,
            paymentType: sale.paymentType,
            date: sale.createdAt,
            items: sale.items.map(item => ({
                quantity: item.quantity,
                name: item.item.name,
            })),
        }));
        res.json({
            summary: {
                totalSales,
                totalPaid,
                outstandingAmount,
                numberOfSales,
                netProfit,
                profitMargin,
                collectionRate,
            },
            salesByHour,
            salesByDay,
            topItems,
            recentSales,
        });
    }
    catch (error) {
        console.error("Error fetching sales by period:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ 6. GET /reports/profit-loss
router.get("/profit-loss", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        let startDate = start ? new Date(start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        let endDate = end ? new Date(end) : new Date();
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                items: {
                    include: {
                        item: true,
                    },
                },
            },
        });
        // Calculate revenue and costs
        let totalRevenue = 0;
        let totalCost = 0;
        const itemProfitability = {};
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const revenue = item.quantity * item.price;
                const cost = item.quantity * (item.item.basePrice || item.price * 0.7); // Assume 70% of selling price if no base price
                const profit = revenue - cost;
                totalRevenue += revenue;
                totalCost += cost;
                if (!itemProfitability[item.item.name]) {
                    itemProfitability[item.item.name] = {
                        name: item.item.name,
                        category: item.item.category || 'General',
                        totalQuantity: 0,
                        totalRevenue: 0,
                        totalCost: 0,
                        totalProfit: 0,
                    };
                }
                itemProfitability[item.item.name].totalQuantity += item.quantity;
                itemProfitability[item.item.name].totalRevenue += revenue;
                itemProfitability[item.item.name].totalCost += cost;
                itemProfitability[item.item.name].totalProfit += profit;
            });
        });
        // Calculate profit margins for each item
        Object.values(itemProfitability).forEach(item => {
            item.profitMargin = item.totalRevenue > 0 ? (item.totalProfit / item.totalRevenue) * 100 : 0;
        });
        const netProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        res.json({
            summary: {
                totalRevenue,
                totalCost,
                netProfit,
                profitMargin,
            },
            topPerformers: Object.values(itemProfitability)
                .sort((a, b) => b.totalProfit - a.totalProfit)
                .slice(0, 15),
            leastProfitable: Object.values(itemProfitability)
                .sort((a, b) => a.totalProfit - b.totalProfit)
                .slice(0, 15),
            categoryBreakdown: [], // Placeholder for future implementation
        });
    }
    catch (error) {
        console.error("Error fetching profit loss:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ 7. GET /reports/inventory-valuation
router.get("/inventory-valuation", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const inventory = await prisma.inventoryItem.findMany();
        const totalValue = inventory.reduce((sum, item) => {
            return sum + (item.quantity * (item.sellPrice || 0));
        }, 0);
        const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
        const categoryBreakdown = {};
        inventory.forEach(item => {
            const category = item.category || 'Uncategorized';
            if (!categoryBreakdown[category]) {
                categoryBreakdown[category] = {
                    name: category,
                    count: 0,
                    value: 0,
                };
            }
            categoryBreakdown[category].count += item.quantity;
            categoryBreakdown[category].value += item.quantity * (item.sellPrice || 0);
        });
        res.json({
            summary: {
                totalValue,
                totalItems,
                categoryCount: Object.keys(categoryBreakdown).length,
            },
            categoryBreakdown: Object.values(categoryBreakdown),
            items: inventory.map(item => ({
                id: item.id,
                name: item.name,
                category: item.category || 'Uncategorized',
                quantity: item.quantity,
                unit: item.unit,
                currentValue: item.quantity * (item.sellPrice || 0),
                sellingPrice: item.sellPrice,
            })),
        });
    }
    catch (error) {
        console.error("Error fetching inventory valuation:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ 8. GET /reports/enhanced-inventory
router.get("/enhanced-inventory", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const inventory = await prisma.inventoryItem.findMany();
        const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
        const totalValue = inventory.reduce((sum, item) => {
            return sum + (item.quantity * (item.sellPrice || 0));
        }, 0);
        // Stock health analysis
        const stockHealthBreakdown = {
            healthy: 0,
            lowStock: 0,
            outOfStock: 0,
            overstocked: 0,
        };
        const itemsNeedingReorder = 0;
        const items = inventory.map(item => {
            let stockHealth = 'healthy';
            if (item.quantity === 0) {
                stockHealth = 'outOfStock';
                stockHealthBreakdown.outOfStock++;
            }
            else if (item.quantity <= (item.lowStockLimit || 5)) {
                stockHealth = 'lowStock';
                stockHealthBreakdown.lowStock++;
            }
            else if (item.quantity > (item.lowStockLimit * 2 || item.quantity * 2)) {
                stockHealth = 'overstocked';
                stockHealthBreakdown.overstocked++;
            }
            else {
                stockHealthBreakdown.healthy++;
            }
            return {
                id: item.id,
                name: item.name,
                category: item.category || 'Uncategorized',
                currentStock: item.quantity,
                unit: item.unit,
                minStock: item.lowStockLimit || 5,
                maxStock: item.lowStockLimit * 2 || item.quantity * 2,
                currentValue: item.quantity * (item.sellPrice || 0),
                sellingPrice: item.sellPrice,
                stockHealth,
                velocityChange: 0, // Placeholder for future implementation
            };
        });
        res.json({
            summary: {
                totalItems,
                totalValue,
                stockHealthBreakdown,
                itemsNeedingReorder,
            },
            items,
        });
    }
    catch (error) {
        console.error("Error fetching enhanced inventory:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ 9. GET /reports/customer-analysis
router.get("/customer-analysis", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        let startDate = start ? new Date(start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        let endDate = end ? new Date(end) : new Date();
        const customers = await prisma.customer.findMany({
            include: {
                sales: {
                    where: {
                        createdAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                },
                transactions: true,
            },
        });
        const topCustomers = customers
            .map(customer => {
            const total = customer.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const orders = customer.sales.length;
            return {
                name: customer.name,
                orders,
                total,
                average: orders > 0 ? total / orders : 0,
            };
        })
            .filter(customer => customer.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 15);
        res.json({
            customers: topCustomers.map(customer => ({
                name: customer.name,
                numberOfOrders: customer.orders,
                totalSpent: customer.total,
                averageOrderValue: customer.average,
            })),
            totalCustomers: customers.length,
            activeCustomers: customers.filter(c => c.sales.length > 0).length,
        });
    }
    catch (error) {
        console.error("Error fetching customer analysis:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ 10. GET /reports/loss-analysis
router.get("/loss-analysis", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const inventory = await prisma.inventoryItem.findMany();
        const highRiskItems = inventory.filter(item => {
            return item.quantity <= (item.lowStockLimit || 5) ||
                item.quantity === 0 ||
                (item.expiryDate && new Date(item.expiryDate) < new Date());
        });
        const wasteRiskItems = inventory.filter(item => {
            return item.expiryDate && new Date(item.expiryDate) < new Date();
        });
        const expiryRiskItems = inventory.filter(item => {
            if (!item.expiryDate)
                return false;
            const daysUntilExpiry = Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
        });
        const totalPotentialLoss = highRiskItems.reduce((sum, item) => {
            return sum + (item.quantity * (item.sellPrice || 0));
        }, 0);
        const items = highRiskItems.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category || 'Uncategorized',
            currentStock: item.quantity,
            unit: item.unit,
            potentialLoss: item.quantity * (item.sellPrice || 0),
            riskType: item.quantity === 0 ? 'outOfStock' :
                item.quantity <= (item.lowStockLimit || 5) ? 'lowStock' : 'expiry',
            recommendations: item.quantity === 0 ? ['Restock immediately'] :
                item.quantity <= (item.lowStockLimit || 5) ? ['Monitor closely', 'Consider restocking'] :
                    ['Check expiry date'],
        }));
        res.json({
            summary: {
                highRiskItems: highRiskItems.length,
                wasteRiskItems: wasteRiskItems.length,
                expiryRiskItems: expiryRiskItems.length,
                totalPotentialLoss,
            },
            items,
        });
    }
    catch (error) {
        console.error("Error fetching loss analysis:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ 11. GET /reports/cash-flow
router.get("/cash-flow", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        let startDate = start ? new Date(start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        let endDate = end ? new Date(end) : new Date();
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const totalCollected = sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
        const totalOutstanding = sales.reduce((sum, sale) => sum + (sale.totalAmount - sale.paidAmount), 0);
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0;
        // Daily cash flow
        const dailyCashFlow = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const daySales = sales.filter(sale => {
                const saleDate = new Date(sale.createdAt);
                return saleDate.toDateString() === currentDate.toDateString();
            });
            const dayRevenue = daySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const dayCollected = daySales.reduce((sum, sale) => sum + sale.paidAmount, 0);
            dailyCashFlow.push({
                date: currentDate.toISOString().split('T')[0],
                revenue: dayRevenue,
                collected: dayCollected,
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        res.json({
            summary: {
                totalCollected,
                totalOutstanding,
                totalRevenue,
                collectionRate,
            },
            dailyCashFlow,
        });
    }
    catch (error) {
        console.error("Error fetching cash flow:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ 12. GET /reports/inventory-projections
router.get("/inventory-projections", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const inventory = await prisma.inventoryItem.findMany();
        let totalProjectedRevenue = 0;
        let totalProjectedCost = 0;
        const itemProjections = [];
        inventory.forEach(item => {
            if (item.sellPrice && item.basePrice && item.quantity > 0) {
                const projectedRevenue = item.quantity * item.sellPrice;
                const projectedCost = item.quantity * item.basePrice;
                const projectedProfit = projectedRevenue - projectedCost;
                const profitMargin = projectedRevenue > 0 ? (projectedProfit / projectedRevenue) * 100 : 0;
                totalProjectedRevenue += projectedRevenue;
                totalProjectedCost += projectedCost;
                itemProjections.push({
                    name: item.name,
                    category: item.category || 'General',
                    totalQuantity: item.quantity,
                    totalRevenue: projectedRevenue,
                    totalCost: projectedCost,
                    totalProfit: projectedProfit,
                    profitMargin,
                    averagePrice: item.sellPrice,
                    averageCost: item.basePrice,
                });
            }
        });
        const netProjectedProfit = totalProjectedRevenue - totalProjectedCost;
        const overallProfitMargin = totalProjectedRevenue > 0 ? (netProjectedProfit / totalProjectedRevenue) * 100 : 0;
        // Sort by projected profit
        const topProjections = itemProjections
            .sort((a, b) => b.totalProfit - a.totalProfit)
            .slice(0, 15);
        const leastProjections = itemProjections
            .sort((a, b) => a.totalProfit - b.totalProfit)
            .slice(0, 15);
        res.json({
            summary: {
                totalRevenue: totalProjectedRevenue,
                totalCost: totalProjectedCost,
                totalProfit: netProjectedProfit,
                profitMargin: overallProfitMargin,
                numberOfItems: itemProjections.length,
            },
            topPerformers: topProjections,
            leastProfitable: leastProjections,
            categoryBreakdown: [],
        });
    }
    catch (error) {
        console.error("Error fetching inventory projections:", error);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
