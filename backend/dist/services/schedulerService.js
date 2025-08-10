"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const pdfService_1 = require("./pdfService");
const emailService_1 = require("./emailService");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class SchedulerService {
    constructor() {
        this.isRunning = false;
        this.pdfService = new pdfService_1.PDFService();
        this.emailService = new emailService_1.EmailService();
    }
    async initialize() {
        try {
            await this.pdfService.initialize();
            console.log('Scheduler service initialized successfully');
        }
        catch (error) {
            console.error('Error initializing scheduler service:', error);
        }
    }
    async cleanup() {
        try {
            await this.pdfService.close();
            console.log('Scheduler service cleaned up successfully');
        }
        catch (error) {
            console.error('Error cleaning up scheduler service:', error);
        }
    }
    // Schedule daily report generation and email sending at midnight
    scheduleDailyReports() {
        // Run at 00:00 (midnight) every day
        node_cron_1.default.schedule('0 0 * * *', async () => {
            console.log('Starting daily report generation...');
            await this.generateAndSendDailyReport();
        }, {
            timezone: "Africa/Nairobi" // Adjust timezone as needed
        });
        console.log('Daily report scheduler started - will run at midnight every day');
    }
    // Generate and send daily report
    async generateAndSendDailyReport(date = new Date()) {
        if (this.isRunning) {
            console.log('Daily report generation already in progress, skipping...');
            return;
        }
        this.isRunning = true;
        try {
            console.log('Generating daily report PDF...');
            const pdfBuffer = await this.pdfService.generateDailyReport(date);
            console.log('PDF generated successfully, sending emails...');
            // Get all admin users who should receive daily reports
            const adminUsers = await prisma.user.findMany({
                where: {
                    role: 'ADMIN'
                }
            });
            if (adminUsers.length === 0) {
                console.log('No admin users found to send reports to');
                return;
            }
            // Send report to each admin user
            const emailPromises = adminUsers.map(user => this.emailService.sendDailyReport(user.email, pdfBuffer, date));
            const results = await Promise.allSettled(emailPromises);
            let successCount = 0;
            let failureCount = 0;
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    successCount++;
                    console.log(`Report sent successfully to ${adminUsers[index].email}`);
                }
                else {
                    failureCount++;
                    console.error(`Failed to send report to ${adminUsers[index].email}:`, result);
                }
            });
            console.log(`Daily report generation completed: ${successCount} successful, ${failureCount} failed`);
        }
        catch (error) {
            console.error('Error generating and sending daily report:', error);
        }
        finally {
            this.isRunning = false;
        }
    }
    // Manual trigger for testing
    async triggerDailyReport(recipientEmail) {
        console.log('Manually triggering daily report generation...');
        try {
            const pdfBuffer = await this.pdfService.generateDailyReport();
            if (recipientEmail) {
                // Send to specific email for testing
                const success = await this.emailService.sendDailyReport(recipientEmail, pdfBuffer);
                if (success) {
                    console.log(`Test report sent successfully to ${recipientEmail}`);
                }
                else {
                    console.error(`Failed to send test report to ${recipientEmail}`);
                }
            }
            else {
                // Send to all admin users
                await this.generateAndSendDailyReport();
            }
        }
        catch (error) {
            console.error('Error in manual report trigger:', error);
        }
    }
    // Test email configuration
    async testEmailConfiguration(recipientEmail) {
        console.log(`Testing email configuration with ${recipientEmail}...`);
        try {
            const success = await this.emailService.sendTestEmail(recipientEmail);
            if (success) {
                console.log('Email configuration test successful');
                return true;
            }
            else {
                console.error('Email configuration test failed');
                return false;
            }
        }
        catch (error) {
            console.error('Error testing email configuration:', error);
            return false;
        }
    }
    // Get scheduler status
    getStatus() {
        return {
            isRunning: this.isRunning,
            nextRun: this.getNextRunTime(),
            timezone: 'Africa/Nairobi'
        };
    }
    getNextRunTime() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.toISOString();
    }
}
exports.SchedulerService = SchedulerService;
