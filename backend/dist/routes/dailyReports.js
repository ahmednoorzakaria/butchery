"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const schedulerService_1 = require("../services/schedulerService");
const pdfService_1 = require("../services/pdfService");
const router = (0, express_1.Router)();
const schedulerService = new schedulerService_1.SchedulerService();
const pdfService = new pdfService_1.PDFService();
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
        // Initialize PDF service if not already done
        await pdfService.initialize();
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
        // Initialize PDF service if not already done
        await pdfService.initialize();
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
exports.default = router;
