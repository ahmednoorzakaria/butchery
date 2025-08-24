import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { getOutstandingBalances, getTopProducts, getInventoryUsage, getUserPerformance, getSalesByPeriod, getProfitLoss } from "../services/reportService";

const router = Router();

// ✅ 1. GET /reports/outstanding-balances
router.get("/outstanding-balances", authenticateToken, async (req, res) => {
	try {
		const data = await getOutstandingBalances();
		res.json(data);
	} catch (error) {
		console.error("Error fetching outstanding balances:", error);
		res.status(500).json({ error: "Server error" });
	}
});

// ✅ 2. GET /reports/top-products
router.get("/top-products", authenticateToken, async (req, res) => {
	const { start, end } = req.query as { start?: string; end?: string };
	try {
		const data = await getTopProducts(start ? new Date(start) : undefined, end ? new Date(end) : undefined);
		res.json(data);
	} catch (error) {
		console.error("Error fetching top products:", error);
		res.status(500).json({ error: "Server error" });
	}
});

// ✅ 3. GET /reports/inventory-usage
router.get("/inventory-usage", authenticateToken, async (req, res) => {
	try {
		const data = await getInventoryUsage();
		res.json(data);
	} catch (error) {
		console.error("Error fetching inventory usage:", error);
		res.status(500).json({ error: "Server error" });
	}
});

// ✅ 4. GET /reports/user-performance
router.get("/user-performance", authenticateToken, async (req, res) => {
	try {
		const data = await getUserPerformance();
		res.json(data);
	} catch (error) {
		console.error("Error fetching user sales performance:", error);
		res.status(500).json({ error: "Server error" });
	}
});

// ✅ 5. GET /reports/sales-by-period
router.get("/sales-by-period", authenticateToken, async (req, res) => {
	try {
		const { period, start, end } = req.query as { period?: string; start?: string; end?: string };
		const data = await getSalesByPeriod(period, start, end);
		res.json(data);
	} catch (error) {
		console.error("Error fetching sales by period:", error);
		res.status(500).json({ error: "Server error" });
	}
});

// ✅ 6. GET /reports/profit-loss
router.get("/profit-loss", authenticateToken, async (req, res) => {
	try {
		const { start, end } = req.query as { start?: string; end?: string };
		const data = await getProfitLoss(start, end);
		res.json(data);
	} catch (error) {
		console.error("Error fetching profit-loss:", error);
		res.status(500).json({ error: "Server error" });
	}
});

export default router;
