"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const schedulerService_1 = require("../services/schedulerService");
const pdfService_1 = require("../services/pdfService");
const emailService_1 = require("../services/emailService");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
const schedulerService = new schedulerService_1.SchedulerService();
const pdfService = new pdfService_1.PDFService();
const emailService = new emailService_1.EmailService();
// Initialize scheduler when the module loads
schedulerService.initialize().then(() => {
    schedulerService.scheduleDailyReports();
});
// GET /daily-reports/status - Get scheduler status
router.get("/status", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const status = schedulerService.getStatus();
        res.json(status);
    }
    catch (error) {
        console.error("Error getting scheduler status:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /daily-reports/trigger - Manually trigger daily report generation
router.post("/trigger", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { recipientEmail } = req.body;
        if (recipientEmail) {
            // Send to specific email for testing
            await schedulerService.triggerDailyReport(recipientEmail);
            res.json({
                success: true,
                message: `Daily report triggered and sent to ${recipientEmail}`
            });
        }
        else {
            // Send to all admin users
            await schedulerService.triggerDailyReport();
            res.json({
                success: true,
                message: "Daily report triggered and sent to all admin users"
            });
        }
    }
    catch (error) {
        console.error("Error triggering daily report:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /daily-reports/test-email - Test email configuration
router.post("/test-email", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { recipientEmail } = req.body;
        if (!recipientEmail) {
            return res.status(400).json({ error: "Recipient email is required" });
        }
        const success = await schedulerService.testEmailConfiguration(recipientEmail);
        if (success) {
            res.json({
                success: true,
                message: `Test email sent successfully to ${recipientEmail}`
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: "Failed to send test email"
            });
        }
    }
    catch (error) {
        console.error("Error testing email configuration:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /daily-reports/download/:date - Download daily report PDF
router.get("/download/:date", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { date } = req.params;
        const reportDate = date ? new Date(date) : new Date();
        const pdfBuffer = await pdfService.generateDailyReport(reportDate);
        const fileName = `daily-report-${date || new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Error downloading daily report:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /daily-reports/preview/:date - Preview daily report in browser
router.get("/preview/:date", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { date } = req.params;
        const reportDate = date ? new Date(date) : new Date();
        const pdfBuffer = await pdfService.generateDailyReport(reportDate);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Error previewing daily report:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /daily-reports/configure - Configure email settings
router.post("/configure", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { emailUser, emailPassword, emailService } = req.body;
        // Update environment variables (you might want to store these in a database)
        if (emailUser)
            process.env.EMAIL_USER = emailUser;
        if (emailPassword)
            process.env.EMAIL_PASSWORD = emailPassword;
        if (emailService)
            process.env.EMAIL_SERVICE = emailService;
        res.json({
            success: true,
            message: "Email configuration updated successfully"
        });
    }
    catch (error) {
        console.error("Error configuring email settings:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /daily-reports/configuration - Get current email configuration
router.get("/configuration", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const config = {
            emailUser: process.env.EMAIL_USER || null,
            emailService: process.env.EMAIL_SERVICE || 'gmail',
            hasPassword: !!process.env.EMAIL_PASSWORD,
            timezone: 'Africa/Nairobi'
        };
        res.json(config);
    }
    catch (error) {
        console.error("Error getting email configuration:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /daily-reports/send-complete-report - Send complete daily report email
router.post("/send-complete-report", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { recipientEmail } = req.body;
        if (!recipientEmail) {
            return res.status(400).json({ error: "Recipient email is required" });
        }
        const reportDate = new Date();
        const pdfBuffer = await pdfService.generateDailyReport(reportDate);
        // Debt summary data
        const customers = await prisma_1.default.customer.findMany({ include: { transactions: true } });
        const debtData = customers.map(customer => {
            const balance = customer.transactions.reduce((sum, tx) => sum + tx.amount, 0);
            return { customerId: customer.id, name: customer.name, balance };
        }).filter(c => c.balance < 0);
        const totalOutstanding = debtData.reduce((sum, c) => sum + Math.abs(c.balance), 0);
        const customerCount = debtData.length;
        const topDebtors = [...debtData].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
        const debtSummary = { totalOutstanding, customerCount, topDebtors };
        // Compute KPIs and top items for the day
        const start = new Date(reportDate);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(reportDate);
        end.setHours(23, 59, 59, 999);
        const sales = await prisma_1.default.sale.findMany({
            where: { createdAt: { gte: start, lte: end } },
            include: { items: { include: { item: true } } }
        });
        const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalPaid = sales.reduce((sum, s) => sum + s.paidAmount, 0);
        const outstandingAmount = totalSales - totalPaid;
        const numberOfSales = sales.length;
        let totalCost = 0;
        const itemAgg = {};
        for (const sale of sales) {
            for (const it of sale.items) {
                const itemCost = it.item.basePrice || it.price * 0.7;
                totalCost += it.quantity * itemCost;
                if (!itemAgg[it.item.name]) {
                    itemAgg[it.item.name] = { quantity: 0, revenue: 0, profit: 0, cost: 0 };
                }
                itemAgg[it.item.name].quantity += it.quantity;
                itemAgg[it.item.name].revenue += it.quantity * it.price;
                itemAgg[it.item.name].cost += it.quantity * itemCost;
                itemAgg[it.item.name].profit += it.quantity * (it.price - itemCost);
            }
        }
        const netProfit = totalSales - totalCost;
        const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
        const collectionRate = totalSales > 0 ? (totalPaid / totalSales) * 100 : 0;
        const averageOrderValue = numberOfSales > 0 ? totalSales / numberOfSales : 0;
        const topItems = Object.entries(itemAgg)
            .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue, profit: data.profit }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        const kpi = { totalSales, totalPaid, outstandingAmount, numberOfSales, averageOrderValue, profitMargin, collectionRate, netProfit };
        // Send email
        const success = await emailService.sendDailyReport(recipientEmail, pdfBuffer, reportDate, debtSummary, kpi, topItems);
        if (success) {
            res.json({ success: true, message: `Complete daily report email sent successfully to ${recipientEmail}`, debtSummary, kpi, topItems });
        }
        else {
            res.status(500).json({ success: false, error: "Failed to send complete daily report email" });
        }
    }
    catch (error) {
        console.error("Error sending complete daily report email:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /daily-reports/debt-summary - Send debt summary email
router.post("/debt-summary", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { recipientEmail } = req.body;
        if (!recipientEmail) {
            return res.status(400).json({ error: "Recipient email is required" });
        }
        // Fetch debt data
        const customers = await prisma_1.default.customer.findMany({
            include: { transactions: true }
        });
        const debtData = customers.map(customer => {
            const balance = customer.transactions.reduce((sum, tx) => sum + tx.amount, 0);
            return {
                customerId: customer.id,
                name: customer.name,
                balance
            };
        }).filter(customer => customer.balance < 0); // Only customers with debt
        const totalOutstanding = debtData.reduce((sum, customer) => sum + Math.abs(customer.balance), 0);
        const customerCount = debtData.length;
        // Sort by debt amount (highest first)
        const topDebtors = [...debtData].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
        const allDebtors = [...debtData].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
        const debtSummary = {
            totalOutstanding,
            customerCount,
            topDebtors: topDebtors, // Include all debtors, not just top 10
            allDebtors
        };
        const success = await emailService.sendDebtSummaryEmail(recipientEmail, debtSummary);
        if (success) {
            res.json({
                success: true,
                message: `Debt summary email sent successfully to ${recipientEmail}`,
                debtSummary: {
                    totalOutstanding,
                    customerCount,
                    topDebtors: topDebtors // Send all debtors for response
                }
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: "Failed to send debt summary email"
            });
        }
    }
    catch (error) {
        console.error("Error sending debt summary email:", error);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
