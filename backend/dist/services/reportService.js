"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOutstandingBalances = getOutstandingBalances;
exports.getTopProducts = getTopProducts;
exports.getInventoryUsage = getInventoryUsage;
exports.getUserPerformance = getUserPerformance;
exports.resolvePeriodRange = resolvePeriodRange;
exports.getSalesByPeriod = getSalesByPeriod;
exports.getProfitLoss = getProfitLoss;
const prisma_1 = __importDefault(require("../lib/prisma"));
const date_fns_1 = require("date-fns");
async function getOutstandingBalances() {
    const customers = await prisma_1.default.customer.findMany({ include: { transactions: true } });
    const balances = customers.map((c) => {
        const balance = c.transactions.reduce((sum, tx) => sum + tx.amount, 0);
        return { customerId: c.id, name: c.name, balance };
    });
    return balances.filter((c) => c.balance < 0);
}
async function getTopProducts(start, end) {
    const startDate = start ?? (0, date_fns_1.subDays)(new Date(), 7);
    const endDate = end ?? new Date();
    const rows = await prisma_1.default.$queryRaw `
    SELECT 
      si."itemId",
      ii.name,
      SUM(si.quantity) as "quantitySold"
    FROM "SaleItem" si
    JOIN "Sale" s ON si."saleId" = s.id
    JOIN "InventoryItem" ii ON si."itemId" = ii.id
    WHERE s."createdAt" >= ${startDate} AND s."createdAt" <= ${endDate}
    GROUP BY si."itemId", ii.name
    ORDER BY "quantitySold" DESC
    LIMIT 10
  `;
    return rows;
}
async function getInventoryUsage() {
    const rows = await prisma_1.default.$queryRaw `
    SELECT 
      ii.id as "itemId",
      ii.name,
      COALESCE(SUM(si.quantity), 0) as "totalUsed",
      ii.quantity as "currentStock"
    FROM "InventoryItem" ii
    LEFT JOIN "SaleItem" si ON ii.id = si."itemId"
    GROUP BY ii.id, ii.name, ii.quantity
    ORDER BY "totalUsed" DESC
  `;
    return rows;
}
async function getUserPerformance() {
    const rows = await prisma_1.default.$queryRaw `
    SELECT 
      u.id as "userId",
      COALESCE(u.name, 'Unknown') as name,
      COALESCE(u.email, 'N/A') as email,
      COALESCE(SUM(s."totalAmount"), 0) as "totalSales",
      COALESCE(SUM(s."paidAmount"), 0) as "totalPaid",
      COUNT(s.id) as "saleCount"
    FROM "User" u
    LEFT JOIN "Sale" s ON u.id = s."userId"
    GROUP BY u.id, u.name, u.email
    ORDER BY "totalSales" DESC
  `;
    return rows;
}
function resolvePeriodRange(period, start, end) {
    if (start && end) {
        return { startDate: new Date(start), endDate: new Date(end) };
    }
    const now = new Date();
    switch (period) {
        case "day":
            return { startDate: (0, date_fns_1.startOfDay)(now), endDate: (0, date_fns_1.endOfDay)(now) };
        case "week":
            return { startDate: (0, date_fns_1.startOfWeek)(now), endDate: (0, date_fns_1.endOfWeek)(now) };
        case "month":
            return { startDate: (0, date_fns_1.startOfMonth)(now), endDate: (0, date_fns_1.endOfMonth)(now) };
        case "year":
            return { startDate: (0, date_fns_1.startOfYear)(now), endDate: (0, date_fns_1.endOfYear)(now) };
        default:
            return { startDate: (0, date_fns_1.subDays)(now, 7), endDate: now };
    }
}
async function getSalesByPeriod(period, start, end) {
    const { startDate, endDate } = resolvePeriodRange(period, start, end);
    const sales = await prisma_1.default.sale.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        include: {
            customer: true,
            items: { include: { item: true } },
        },
    });
    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPaid = sales.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0);
    const outstandingAmount = totalSales - totalPaid;
    const numberOfSales = sales.length;
    let totalCost = 0;
    const itemSales = {};
    for (const sale of sales) {
        for (const si of sale.items) {
            const itemCost = si.item.basePrice || si.price * 0.7;
            totalCost += si.quantity * itemCost;
            if (!itemSales[si.item.name]) {
                itemSales[si.item.name] = { quantity: 0, revenue: 0, profit: 0, cost: 0 };
            }
            itemSales[si.item.name].quantity += si.quantity;
            itemSales[si.item.name].revenue += si.quantity * si.price;
            itemSales[si.item.name].cost += si.quantity * itemCost;
            itemSales[si.item.name].profit += si.quantity * (si.price - itemCost);
        }
    }
    const netProfit = totalSales - totalCost;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    const collectionRate = totalSales > 0 ? (totalPaid / totalSales) * 100 : 0;
    const averageOrderValue = numberOfSales > 0 ? totalSales / numberOfSales : 0;
    const salesByHour = Array.from({ length: 24 }, (_, hour) => {
        const hourSales = sales.filter((sale) => new Date(sale.createdAt).getHours() === hour);
        return { hour: `${hour}:00`, sales: hourSales.reduce((sum, s) => sum + s.totalAmount, 0) };
    });
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const salesByDay = daysOfWeek.map((day, index) => {
        const daySales = sales.filter((sale) => new Date(sale.createdAt).getDay() === index);
        return { day, sales: daySales.reduce((sum, s) => sum + s.totalAmount, 0) };
    });
    const topItems = Object.entries(itemSales)
        .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue, cost: data.cost, profit: data.profit }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    const recentSales = sales
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map((sale) => ({
        id: sale.id,
        customer: sale.customer?.name,
        amount: sale.totalAmount,
        paymentType: sale.paymentType,
        date: sale.createdAt,
        items: sale.items.map((item) => ({ quantity: item.quantity, name: item.item.name })),
    }));
    return {
        summary: {
            totalSales,
            totalPaid,
            totalDiscount,
            outstandingAmount,
            numberOfSales,
            netProfit,
            profitMargin,
            collectionRate,
            averageOrderValue,
        },
        salesByHour,
        salesByDay,
        topItems,
        recentSales,
    };
}
async function getProfitLoss(start, end) {
    const startDate = start ? new Date(start) : (0, date_fns_1.subDays)(new Date(), 7);
    const endDate = end ? new Date(end) : new Date();
    const sales = await prisma_1.default.sale.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        include: { items: { include: { item: true } } },
    });
    let totalRevenue = 0;
    let totalCost = 0;
    const itemProfitability = {};
    for (const sale of sales) {
        for (const it of sale.items) {
            const revenue = it.quantity * it.price;
            const cost = it.quantity * (it.item.basePrice || it.price * 0.7);
            const profit = revenue - cost;
            totalRevenue += revenue;
            totalCost += cost;
            if (!itemProfitability[it.item.name]) {
                itemProfitability[it.item.name] = { name: it.item.name, category: it.item.category || "General", totalQuantity: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 };
            }
            itemProfitability[it.item.name].totalQuantity += it.quantity;
            itemProfitability[it.item.name].totalRevenue += revenue;
            itemProfitability[it.item.name].totalCost += cost;
            itemProfitability[it.item.name].totalProfit += profit;
        }
    }
    Object.values(itemProfitability).forEach((item) => {
        item.profitMargin = item.totalRevenue > 0 ? (item.totalProfit / item.totalRevenue) * 100 : 0;
    });
    const netProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const topPerformers = Object.values(itemProfitability)
        .sort((a, b) => b.totalProfit - a.totalProfit)
        .slice(0, 10);
    return {
        summary: { totalRevenue, totalCost, totalProfit: netProfit, profitMargin },
        itemProfitability: Object.values(itemProfitability),
        topPerformers,
    };
}
