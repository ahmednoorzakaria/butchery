import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { SchedulerService } from "../services/schedulerService";
import { PDFService } from "../services/pdfService";
import { EmailService } from "../services/emailService";
import prisma from "../lib/prisma";

const router = Router();
const schedulerService = new SchedulerService();
const pdfService = new PDFService();
const emailService = new EmailService();

// Initialize scheduler when the module loads
schedulerService.initialize().then(() => {
  schedulerService.scheduleDailyReports();
});

// GET /daily-reports/status - Get scheduler status
router.get("/status", authenticateToken, async (req, res) => {
  try {
    const status = schedulerService.getStatus();
    res.json(status);
  } catch (error) {
    console.error("Error getting scheduler status:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /daily-reports/trigger - Manually trigger daily report generation
router.post("/trigger", authenticateToken, async (req, res) => {
  try {
    const { recipientEmail } = req.body;
    
    if (recipientEmail) {
      // Send to specific email for testing
      await schedulerService.triggerDailyReport(recipientEmail);
      res.json({ 
        success: true, 
        message: `Daily report triggered and sent to ${recipientEmail}` 
      });
    } else {
      // Send to all admin users
      await schedulerService.triggerDailyReport();
      res.json({ 
        success: true, 
        message: "Daily report triggered and sent to all admin users" 
      });
    }
  } catch (error) {
    console.error("Error triggering daily report:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /daily-reports/test-email - Test email configuration
router.post("/test-email", authenticateToken, async (req, res) => {
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
    } else {
      res.status(500).json({ 
        success: false, 
        error: "Failed to send test email" 
      });
    }
  } catch (error) {
    console.error("Error testing email configuration:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /daily-reports/download/:date - Download daily report PDF
router.get("/download/:date", authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const reportDate = date ? new Date(date) : new Date();
    
    const pdfBuffer = await pdfService.generateDailyReport(reportDate);
    
    const fileName = `daily-report-${date || new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error downloading daily report:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /daily-reports/preview/:date - Preview daily report in browser
router.get("/preview/:date", authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const reportDate = date ? new Date(date) : new Date();
    
    const pdfBuffer = await pdfService.generateDailyReport(reportDate);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error previewing daily report:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /daily-reports/configure - Configure email settings
router.post("/configure", authenticateToken, async (req, res) => {
  try {
    const { emailUser, emailPassword, emailService } = req.body;
    
    // Update environment variables (you might want to store these in a database)
    if (emailUser) process.env.EMAIL_USER = emailUser;
    if (emailPassword) process.env.EMAIL_PASSWORD = emailPassword;
    if (emailService) process.env.EMAIL_SERVICE = emailService;
    
    res.json({ 
      success: true, 
      message: "Email configuration updated successfully" 
    });
  } catch (error) {
    console.error("Error configuring email settings:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /daily-reports/configuration - Get current email configuration
router.get("/configuration", authenticateToken, async (req, res) => {
  try {
    const config = {
      emailUser: process.env.EMAIL_USER || null,
      emailService: process.env.EMAIL_SERVICE || 'gmail',
      hasPassword: !!process.env.EMAIL_PASSWORD,
      timezone: 'Africa/Nairobi'
    };
    
    res.json(config);
  } catch (error) {
    console.error("Error getting email configuration:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /daily-reports/send-complete-report - Send complete daily report email
router.post("/send-complete-report", authenticateToken, async (req, res) => {
  try {
    const { recipientEmail } = req.body;
    
    if (!recipientEmail) {
      return res.status(400).json({ error: "Recipient email is required" });
    }

    // Generate the daily report HTML
    const pdfBuffer = await pdfService.generateDailyReport(new Date());
    
    // Get debt summary data
    const customers = await prisma.customer.findMany({
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

    const debtSummary = {
      totalOutstanding,
      customerCount,
      topDebtors: topDebtors
    };

    // Send the complete daily report email
    const success = await emailService.sendDailyReport(recipientEmail, pdfBuffer, new Date(), debtSummary);
    
    if (success) {
      res.json({ 
        success: true, 
        message: `Complete daily report email sent successfully to ${recipientEmail}`,
        debtSummary: {
          totalOutstanding,
          customerCount,
          topDebtors: topDebtors
        }
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: "Failed to send complete daily report email" 
      });
    }
  } catch (error) {
    console.error("Error sending complete daily report email:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /daily-reports/debt-summary - Send debt summary email
router.post("/debt-summary", authenticateToken, async (req, res) => {
  try {
    const { recipientEmail } = req.body;
    
    if (!recipientEmail) {
      return res.status(400).json({ error: "Recipient email is required" });
    }

    // Fetch debt data
    const customers = await prisma.customer.findMany({
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
    } else {
      res.status(500).json({ 
        success: false, 
        error: "Failed to send debt summary email" 
      });
    }
  } catch (error) {
    console.error("Error sending debt summary email:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
