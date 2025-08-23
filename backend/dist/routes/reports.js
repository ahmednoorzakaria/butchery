"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const reportService_1 = require("../services/reportService");
const router = (0, express_1.Router)();
// ✅ 1. GET /reports/outstanding-balances
router.get("/outstanding-balances", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const data = await (0, reportService_1.getOutstandingBalances)();
        res.json(data);
    }
    catch (error) {
        console.error("Error fetching outstanding balances:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ 2. GET /reports/top-products
router.get("/top-products", authMiddleware_1.authenticateToken, async (req, res) => {
    const { start, end } = req.query;
    try {
        const data = await (0, reportService_1.getTopProducts)(start ? new Date(start) : undefined, end ? new Date(end) : undefined);
        res.json(data);
    }
    catch (error) {
        console.error("Error fetching top products:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ 3. GET /reports/inventory-usage
router.get("/inventory-usage", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const data = await (0, reportService_1.getInventoryUsage)();
        res.json(data);
    }
    catch (error) {
        console.error("Error fetching inventory usage:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ 4. GET /reports/user-performance
router.get("/user-performance", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const data = await (0, reportService_1.getUserPerformance)();
        res.json(data);
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
        const data = await (0, reportService_1.getSalesByPeriod)(period, start, end);
        res.json(data);
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
        const data = await (0, reportService_1.getProfitLoss)(start, end);
        res.json(data);
    }
    catch (error) {
        console.error("Error fetching profit-loss:", error);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
