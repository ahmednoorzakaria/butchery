import cron from 'node-cron';
import { PDFService } from './pdfService';
import { EmailService } from './emailService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SchedulerService {
  private pdfService: PDFService;
  private emailService: EmailService;
  private isRunning: boolean = false;

  constructor() {
    this.pdfService = new PDFService();
    this.emailService = new EmailService();
  }

  async initialize() {
    try {
      console.log('Scheduler service initialized successfully');
    } catch (error) {
      console.error('Error initializing scheduler service:', error);
    }
  }

  async cleanup() {
    try {
      console.log('Scheduler service cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up scheduler service:', error);
    }
  }

  // Schedule daily report generation and email sending at midnight
  scheduleDailyReports() {
    // Run at 00:00 (midnight) every day
    cron.schedule('0 0 * * *', async () => {
      console.log('Starting daily report generation...');
      await this.generateAndSendDailyReport();
    }, {
      timezone: "Africa/Nairobi" // Adjust timezone as needed
    });

    console.log('Daily report scheduler started - will run at midnight every day');
  }

  // Generate and send daily report
  async generateAndSendDailyReport(date: Date = new Date()) {
    if (this.isRunning) {
      console.log('Daily report generation already in progress, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      console.log('Generating daily report PDF...');
      const pdfBuffer = await this.pdfService.generateDailyReport(date);
      
      console.log('PDF generated successfully, sending emails...');
      
      // Get debt summary data
      const debtSummary = await this.getDebtSummary();
      
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
      const emailPromises = adminUsers.map(user => 
        this.emailService.sendDailyReport(user.email, pdfBuffer, date, debtSummary || undefined)
      );

      const results = await Promise.allSettled(emailPromises);
      
      let successCount = 0;
      let failureCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          successCount++;
          console.log(`Report sent successfully to ${adminUsers[index].email}`);
        } else {
          failureCount++;
          console.error(`Failed to send report to ${adminUsers[index].email}:`, result);
        }
      });

      console.log(`Daily report generation completed: ${successCount} successful, ${failureCount} failed`);

    } catch (error) {
      console.error('Error generating and sending daily report:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Manual trigger for testing
  async triggerDailyReport(recipientEmail?: string) {
    console.log('Manually triggering daily report generation...');
    
    try {
      const pdfBuffer = await this.pdfService.generateDailyReport();
      const debtSummary = await this.getDebtSummary();
      
      if (recipientEmail) {
        // Send to specific email for testing
        const success = await this.emailService.sendDailyReport(recipientEmail, pdfBuffer, new Date(), debtSummary || undefined);
        if (success) {
          console.log(`Test report sent successfully to ${recipientEmail}`);
        } else {
          console.error(`Failed to send test report to ${recipientEmail}`);
        }
      } else {
        // Send to all admin users
        await this.generateAndSendDailyReport();
      }
    } catch (error) {
      console.error('Error in manual report trigger:', error);
    }
  }

  // Test email configuration
  async testEmailConfiguration(recipientEmail: string) {
    console.log(`Testing email configuration with ${recipientEmail}...`);
    
    try {
      const success = await this.emailService.sendTestEmail(recipientEmail);
      if (success) {
        console.log('Email configuration test successful');
        return true;
      } else {
        console.error('Email configuration test failed');
        return false;
      }
    } catch (error) {
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

  private getNextRunTime(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return tomorrow.toISOString();
  }

  // Get debt summary data
  private async getDebtSummary() {
    try {
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

      return {
        totalOutstanding,
        customerCount,
        topDebtors: topDebtors, // Include all debtors, not just top 10
        allDebtors: debtData
      };
    } catch (error) {
      console.error('Error fetching debt summary:', error);
      return null;
    }
  }
}
