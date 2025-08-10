"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? { "default": mod } : mod;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const authMiddleware_1 = require("../middleware/authMiddleware");
const date_fns_1 = require("date-fns");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();

// 1. GET /reports/profits - Actual profits from sold items
router.get("/profits", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        let startDate = start ? new Date(start) : (0, date_fns_1.subDays)(new Date(), 30);
        let endDate = end ? new Date(end) : new Date();
        
        // Get sales with items and their base prices
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                items: {
                    include: {
                        item: true
                    }
                }
            }
        });

        let totalProfit = 0;
        let totalRevenue = 0;
        let totalCost = 0;
        const itemProfits = [];

        for (const sale of sales) {
            for (const saleItem of sale.items) {
                const basePrice = saleItem.item.basePrice || 0;
                const sellPrice = saleItem.price;
                const quantity = saleItem.quantity;
                
                const profit = (sellPrice - basePrice) * quantity;
                const revenue = sellPrice * quantity;
                const cost = basePrice * quantity;
                
                totalProfit += profit;
                totalRevenue += revenue;
                totalCost += cost;

                itemProfits.push({
                    itemName: saleItem.item.name,
                    quantity: quantity,
                    unitPrice: sellPrice,
                    basePrice: basePrice,
                    profit: profit,
                    profitMargin: basePrice > 0 ? ((sellPrice - basePrice) / basePrice) * 100 : 0
                });
            }
        }

        // Sort by profit descending
        itemProfits.sort((a, b) => b.profit - a.profit);

        const summary = {
            totalProfit: totalProfit,
            totalRevenue: totalRevenue,
            totalCost: totalCost,
            profitMargin: totalCost > 0 ? (totalProfit / totalCost) * 100 : 0
        };

        res.json({
            summary,
            itemProfits
        });
    } catch (error) {
        console.error("Error fetching profits:", error);
        res.status(500).json({ error: "Failed to fetch profits data" });
    }
});

// 2. GET /reports/projected-profits - Potential profits from current inventory
router.get("/projected-profits", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const inventory = await prisma.item.findMany({
            where: {
                quantity: { gt: 0 }
            }
        });

        let totalProjectedProfit = 0;
        let totalProjectedRevenue = 0;
        let totalProjectedCost = 0;
        const itemProjections = [];

        for (const item of inventory) {
            const basePrice = item.basePrice || 0;
            const sellPrice = item.sellPrice || basePrice;
            const currentStock = item.quantity;
            
            const projectedProfit = (sellPrice - basePrice) * currentStock;
            const projectedRevenue = sellPrice * currentStock;
            const projectedCost = basePrice * currentStock;
            
            totalProjectedProfit += projectedProfit;
            totalProjectedRevenue += projectedRevenue;
            totalProjectedCost += projectedCost;

            itemProjections.push({
                itemName: item.name,
                category: item.category,
                currentStock: currentStock,
                unit: item.unit,
                basePrice: basePrice,
                sellPrice: sellPrice,
                projectedProfit: projectedProfit,
                profitMargin: basePrice > 0 ? ((sellPrice - basePrice) / basePrice) * 100 : 0
            });
        }

        // Sort by projected profit descending
        itemProjections.sort((a, b) => b.projectedProfit - a.projectedProfit);

        const summary = {
            totalProjectedProfit: totalProjectedProfit,
            totalProjectedRevenue: totalProjectedRevenue,
            totalProjectedCost: totalProjectedCost,
            profitMargin: totalProjectedCost > 0 ? (totalProjectedProfit / totalProjectedCost) * 100 : 0
        };

        res.json({
            summary,
            itemProjections
        });
    } catch (error) {
        console.error("Error fetching projected profits:", error);
        res.status(500).json({ error: "Failed to fetch projected profits data" });
    }
});

// 3. GET /reports/losses - Items sold at a loss
router.get("/losses", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        let startDate = start ? new Date(start) : (0, date_fns_1.subDays)(new Date(), 30);
        let endDate = end ? new Date(end) : new Date();
        
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                items: {
                    include: {
                        item: true
                    }
                }
            }
        });

        let totalLoss = 0;
        let numberOfLossItems = 0;
        const lossItems = [];

        for (const sale of sales) {
            for (const saleItem of sale.items) {
                const basePrice = saleItem.item.basePrice || 0;
                const sellPrice = saleItem.price;
                
                if (sellPrice < basePrice) {
                    const loss = (basePrice - sellPrice) * saleItem.quantity;
                    totalLoss += loss;
                    numberOfLossItems++;

                    lossItems.push({
                        itemName: saleItem.item.name,
                        quantity: saleItem.quantity,
                        basePrice: basePrice,
                        sellPrice: sellPrice,
                        loss: loss,
                        lossPercentage: ((basePrice - sellPrice) / basePrice) * 100
                    });
                }
            }
        }

        // Sort by loss descending
        lossItems.sort((a, b) => b.loss - a.loss);

        const summary = {
            totalLoss: totalLoss,
            numberOfLossItems: numberOfLossItems,
            numberOfSales: sales.length
        };

        res.json({
            summary,
            lossItems
        });
    } catch (error) {
        console.error("Error fetching losses:", error);
        res.status(500).json({ error: "Failed to fetch losses data" });
    }
});

// 4. GET /reports/most-sold - Most sold items
router.get("/most-sold", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        let startDate = start ? new Date(start) : (0, date_fns_1.subDays)(new Date(), 30);
        let endDate = end ? new Date(end) : new Date();
        
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                items: {
                    include: {
                        item: true
                    }
                }
            }
        });

        const itemStats = new Map();

        for (const sale of sales) {
            for (const saleItem of sale.items) {
                const itemId = saleItem.itemId;
                const itemName = saleItem.item.name;
                const category = saleItem.item.category;
                const quantity = saleItem.quantity;
                const price = saleItem.price;

                if (itemStats.has(itemId)) {
                    const stats = itemStats.get(itemId);
                    stats.totalQuantity += quantity;
                    stats.totalRevenue += price * quantity;
                    stats.numberOfSales++;
                    stats.totalPrice += price;
                } else {
                    itemStats.set(itemId, {
                        id: itemId,
                        name: itemName,
                        category: category,
                        totalQuantity: quantity,
                        totalRevenue: price * quantity,
                        numberOfSales: 1,
                        totalPrice: price
                    });
                }
            }
        }

        const items = Array.from(itemStats.values()).map(stats => ({
            ...stats,
            averagePrice: stats.totalPrice / stats.numberOfSales
        }));

        // Sort by total quantity descending
        items.sort((a, b) => b.totalQuantity - a.totalQuantity);

        const summary = {
            totalItems: items.length,
            totalRevenue: items.reduce((sum, item) => sum + item.totalRevenue, 0)
        };

        res.json({
            summary,
            items
        });
    } catch (error) {
        console.error("Error fetching most sold items:", error);
        res.status(500).json({ error: "Failed to fetch most sold items data" });
    }
});

// 5. GET /reports/customers-debt - Customers with outstanding balances
router.get("/customers-debt", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            include: {
                sales: {
                    where: {
                        OR: [
                            { paymentType: "CREDIT" },
                            { amount: { gt: { paidAmount: true } } }
                        ]
                    }
                }
            }
        });

        const customersWithDebt = [];
        let totalOutstanding = 0;

        for (const customer of customers) {
            let outstandingBalance = 0;
            
            for (const sale of customer.sales) {
                const saleAmount = sale.amount;
                const paidAmount = sale.paidAmount || 0;
                outstandingBalance += (saleAmount - paidAmount);
            }

            if (outstandingBalance > 0) {
                customersWithDebt.push({
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone,
                    outstandingBalance: outstandingBalance,
                    totalSales: customer.sales.reduce((sum, sale) => sum + sale.amount, 0),
                    numberOfSales: customer.sales.length
                });
                totalOutstanding += outstandingBalance;
            }
        }

        // Sort by outstanding balance descending
        customersWithDebt.sort((a, b) => b.outstandingBalance - a.outstandingBalance);

        const summary = {
            customersWithDebt: customersWithDebt.length,
            totalOutstanding: totalOutstanding,
            totalCustomers: customers.length
        };

        res.json({
            summary,
            customers: customersWithDebt
        });
    } catch (error) {
        console.error("Error fetching customers debt:", error);
        res.status(500).json({ error: "Failed to fetch customers debt data" });
    }
});

// 6. GET /reports/sales-summary - Combined sales by period
router.get("/sales-summary/:period", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { period } = req.params;
        const now = new Date();
        
        let startDate, endDate;
        
        switch (period) {
            case 'day':
                startDate = (0, date_fns_1.startOfDay)(now);
                endDate = (0, date_fns_1.endOfDay)(now);
                break;
            case 'week':
                startDate = (0, date_fns_1.startOfWeek)(now);
                endDate = (0, date_fns_1.endOfWeek)(now);
                break;
            case 'month':
                startDate = (0, date_fns_1.startOfMonth)(now);
                endDate = (0, date_fns_1.endOfMonth)(now);
                break;
            case 'year':
                startDate = (0, date_fns_1.startOfYear)(now);
                endDate = (0, date_fns_1.endOfYear)(now);
                break;
            default:
                return res.status(400).json({ error: "Invalid period. Use: day, week, month, year" });
        }

        const sales = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                customer: true,
                items: {
                    include: {
                        item: true
                    }
                }
            }
        });

        const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
        const totalPaid = sales.reduce((sum, sale) => sum + (sale.paidAmount || 0), 0);
        const outstandingAmount = totalSales - totalPaid;

        const summary = {
            totalSales: totalSales,
            totalPaid: totalPaid,
            outstandingAmount: outstandingAmount,
            numberOfSales: sales.length
        };

        const periodInfo = {
            period: period,
            startDate: startDate,
            endDate: endDate
        };

        res.json({
            summary,
            period: periodInfo,
            sales: sales.slice(0, 50) // Limit to 50 most recent sales
        });
    } catch (error) {
        console.error("Error fetching sales summary:", error);
        res.status(500).json({ error: "Failed to fetch sales summary data" });
    }
});

// 7. GET /reports/profits-summary - Combined profits by period
router.get("/profits-summary/:period", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { period } = req.params;
        const now = new Date();
        
        let startDate, endDate;
        
        switch (period) {
            case 'day':
                startDate = (0, date_fns_1.startOfDay)(now);
                endDate = (0, date_fns_1.endOfDay)(now);
                break;
            case 'week':
                startDate = (0, date_fns_1.startOfWeek)(now);
                endDate = (0, date_fns_1.endOfWeek)(now);
                break;
            case 'month':
                startDate = (0, date_fns_1.startOfMonth)(now);
                endDate = (0, date_fns_1.endOfMonth)(now);
                break;
            case 'year':
                startDate = (0, date_fns_1.startOfYear)(now);
                endDate = (0, date_fns_1.endOfYear)(now);
                break;
            default:
                return res.status(400).json({ error: "Invalid period. Use: day, week, month, year" });
        }

        const sales = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                items: {
                    include: {
                        item: true
                    }
                }
            }
        });

        let totalProfit = 0;
        let totalRevenue = 0;
        let totalCost = 0;
        const profitByItem = new Map();

        for (const sale of sales) {
            for (const saleItem of sale.items) {
                const basePrice = saleItem.item.basePrice || 0;
                const sellPrice = saleItem.price;
                const quantity = saleItem.quantity;
                const itemId = saleItem.itemId;
                
                const profit = (sellPrice - basePrice) * quantity;
                const revenue = sellPrice * quantity;
                const cost = basePrice * quantity;
                
                totalProfit += profit;
                totalRevenue += revenue;
                totalCost += cost;

                if (profitByItem.has(itemId)) {
                    const itemStats = profitByItem.get(itemId);
                    itemStats.profit += profit;
                    itemStats.revenue += revenue;
                    itemStats.quantity += quantity;
                } else {
                    profitByItem.set(itemId, {
                        id: itemId,
                        name: saleItem.item.name,
                        category: saleItem.item.category,
                        profit: profit,
                        revenue: revenue,
                        quantity: quantity
                    });
                }
            }
        }

        const profitByItemArray = Array.from(profitByItem.values());
        profitByItemArray.sort((a, b) => b.profit - a.profit);

        const summary = {
            totalProfit: totalProfit,
            totalRevenue: totalRevenue,
            totalCost: totalCost,
            profitMargin: totalCost > 0 ? (totalProfit / totalCost) * 100 : 0
        };

        const periodInfo = {
            period: period,
            startDate: startDate,
            endDate: endDate
        };

        res.json({
            summary,
            period: periodInfo,
            profitByItem: profitByItemArray
        });
    } catch (error) {
        console.error("Error fetching profits summary:", error);
        res.status(500).json({ error: "Failed to fetch profits summary data" });
    }
});

// 8. GET /reports/inventory - Inventory status
router.get("/inventory", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const items = await prisma.item.findMany({
            orderBy: {
                name: 'asc'
            }
        });

        let totalValue = 0;
        let potentialProfit = 0;
        let healthy = 0;
        let lowStock = 0;
        let outOfStock = 0;
        let overstocked = 0;
        const categories = new Set();

        for (const item of items) {
            const basePrice = item.basePrice || 0;
            const sellPrice = item.sellPrice || basePrice;
            const currentValue = basePrice * item.quantity;
            const itemPotentialProfit = (sellPrice - basePrice) * item.quantity;
            
            totalValue += currentValue;
            potentialProfit += itemPotentialProfit;
            categories.add(item.category);

            // Determine stock status
            if (item.quantity === 0) {
                outOfStock++;
            } else if (item.quantity <= 10) { // Assuming 10 is low stock threshold
                lowStock++;
            } else if (item.quantity > 100) { // Assuming 100 is overstocked threshold
                overstocked++;
            } else {
                healthy++;
            }
        }

        const inventoryItems = items.map(item => {
            const basePrice = item.basePrice || 0;
            const sellPrice = item.sellPrice || basePrice;
            const currentValue = basePrice * item.quantity;
            const currentCost = basePrice * item.quantity;
            
            let stockStatus = 'healthy';
            if (item.quantity === 0) {
                stockStatus = 'out_of_stock';
            } else if (item.quantity <= 10) {
                stockStatus = 'low_stock';
            } else if (item.quantity > 100) {
                stockStatus = 'overstocked';
            }

            return {
                id: item.id,
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                basePrice: basePrice,
                sellPrice: sellPrice,
                currentValue: currentValue,
                currentCost: currentCost,
                stockStatus: stockStatus
            };
        });

        const summary = {
            totalItems: items.length,
            totalValue: totalValue,
            potentialProfit: potentialProfit,
            categoryCount: categories.size
        };

        const stockHealth = {
            healthy: healthy,
            lowStock: lowStock,
            outOfStock: outOfStock,
            overstocked: overstocked
        };

        res.json({
            summary,
            stockHealth,
            items: inventoryItems
        });
    } catch (error) {
        console.error("Error fetching inventory:", error);
        res.status(500).json({ error: "Failed to fetch inventory data" });
    }
});

module.exports = router;
