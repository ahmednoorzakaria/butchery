import cron from 'node-cron';
import { ProfessionalReportService } from './professionalReportService';
import { EmailService } from './emailService';
import prisma from '../lib/prisma';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export class SchedulerService {
  private reportService: ProfessionalReportService;
  private emailService: EmailService;
  private isRunning: boolean = false;

  constructor() {
    this.reportService = new ProfessionalReportService();
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
      console.log('Generating daily report Excel...');
      const excelBuffer = await this.reportService.generateExcelReport(date);
      
      console.log('Excel report generated successfully, sending emails...');
      
      // Get summaries
      const debtSummary = await this.getDebtSummary();
      const { kpi, topItems } = await this.computeDailyKPIs(date);

      // Compute week-to-date and month-to-date KPIs
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      const weekly = await this.computeKPIsForRange(weekStart, weekEnd);
      const monthly = await this.computeKPIsForRange(monthStart, monthEnd);

      // Inventory summary (current snapshot)
      const inventorySummary = await this.getInventorySummary();

      // Expenses totals
      const dailyExpensesTotal = await this.getExpensesTotal(
        new Date(new Date(date).setHours(0,0,0,0)),
        new Date(new Date(date).setHours(23,59,59,999))
      );
      const weeklyExpensesTotal = await this.getExpensesTotal(weekStart, weekEnd);
      const monthlyExpensesTotal = await this.getExpensesTotal(monthStart, monthEnd);
      
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
        this.emailService.sendDailyReport(
          user.email,
          excelBuffer,
          date,
          debtSummary || undefined,
          kpi,
          topItems,
          `daily-report-${date.toISOString().split('T')[0]}.xlsx`,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          {
            weekly: weekly.kpi,
            monthly: monthly.kpi,
            inventory: inventorySummary,
            expenses: {
              dailyTotal: dailyExpensesTotal,
              weeklyTotal: weeklyExpensesTotal,
              monthlyTotal: monthlyExpensesTotal,
            }
          }
        )
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
      const excelBuffer = await this.reportService.generateExcelReport();
      const debtSummary = await this.getDebtSummary();
      const { kpi, topItems } = await this.computeDailyKPIs(new Date());
      
      if (recipientEmail) {
        // Send to specific email for testing
        const success = await this.emailService.sendDailyReport(
          recipientEmail, 
          excelBuffer, 
          new Date(), 
          debtSummary || undefined, 
          kpi, 
          topItems,
          `daily-report-${new Date().toISOString().split('T')[0]}.xlsx`,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
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
      
      // Sort by debt amount (highest first) and ensure we have valid data
      const topDebtors = [...debtData]
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
        .filter(customer => customer.balance < 0 && Math.abs(customer.balance) > 0.01); // Filter out very small amounts

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

  public async getDailyKPIs(date: Date) {
    return this.computeDailyKPIs(date);
  }

  private async computeDailyKPIs(date: Date): Promise<{ kpi: {
    totalSales: number;
    totalPaid: number;
    outstandingAmount: number;
    numberOfSales: number;
    averageOrderValue: number;
    profitMargin: number;
    collectionRate: number;
    netProfit: number;
  }; topItems: Array<{ name: string; quantity: number; revenue: number; profit: number }>; }> {
    try {
      // Fix: Use current day instead of previous day
      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(date);
      end.setHours(23,59,59,999);

      const sales = await prisma.sale.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { items: { include: { item: true } } }
      });

      const totalSales = sales.reduce((sum, s) => {
        const amount = s.totalAmount || 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      const totalPaid = sales.reduce((sum, s) => {
        const amount = s.paidAmount || 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      const outstandingAmount = totalSales - totalPaid;
      const numberOfSales = sales.length;

      let totalCost = 0;
      const itemAgg: Record<string, { quantity: number; revenue: number; profit: number; cost: number }> = {};
      for (const sale of sales) {
        for (const it of sale.items) {
          // Fix: Use actual base price if available, otherwise estimate more accurately
          const itemCost = (it.item as any).basePrice || (it.item as any).sellPrice * 0.6;
          const quantity = it.quantity || 0;
          const price = it.price || 0;
          
          totalCost += quantity * itemCost;
          if (!itemAgg[it.item.name]) {
            itemAgg[it.item.name] = { quantity: 0, revenue: 0, profit: 0, cost: 0 };
          }
          itemAgg[it.item.name].quantity += quantity;
          itemAgg[it.item.name].revenue += quantity * price;
          itemAgg[it.item.name].cost += quantity * itemCost;
          itemAgg[it.item.name].profit += quantity * (price - itemCost);
        }
      }

      const netProfit = totalSales - totalCost;
      const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
      const collectionRate = totalSales > 0 ? (totalPaid / totalSales) * 100 : 0;
      const averageOrderValue = numberOfSales > 0 ? totalSales / numberOfSales : 0;

      const topItems = Object.entries(itemAgg)
        .map(([name, data]) => ({ 
          name, 
          quantity: data.quantity, 
          revenue: data.revenue, 
          profit: data.profit 
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      return {
        kpi: { 
          totalSales: isNaN(totalSales) ? 0 : totalSales, 
          totalPaid: isNaN(totalPaid) ? 0 : totalPaid, 
          outstandingAmount: isNaN(outstandingAmount) ? 0 : outstandingAmount, 
          numberOfSales, 
          averageOrderValue: isNaN(averageOrderValue) ? 0 : averageOrderValue, 
          profitMargin: isNaN(profitMargin) ? 0 : profitMargin, 
          collectionRate: isNaN(collectionRate) ? 0 : collectionRate, 
          netProfit: isNaN(netProfit) ? 0 : netProfit 
        },
        topItems
      };
    } catch (error) {
      console.error('Error computing daily KPIs:', error);
      return { kpi: { totalSales: 0, totalPaid: 0, outstandingAmount: 0, numberOfSales: 0, averageOrderValue: 0, profitMargin: 0, collectionRate: 0, netProfit: 0 }, topItems: [] };
    }
  }

  private async computeKPIsForRange(start: Date, end: Date) {
    try {
      const sales = await prisma.sale.findMany({
        where: { createdAt: { gte: new Date(start), lte: new Date(end) } },
        include: { items: { include: { item: true } } }
      });

      const totalSales = sales.reduce((sum, s) => {
        const amount = s.totalAmount || 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      const totalPaid = sales.reduce((sum, s) => {
        const amount = s.paidAmount || 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      const outstandingAmount = totalSales - totalPaid;
      const numberOfSales = sales.length;

      let totalCost = 0;
      for (const sale of sales) {
        for (const it of sale.items) {
          // Fix: Use actual base price if available, otherwise estimate more accurately
          const itemCost = (it.item as any).basePrice || (it.item as any).sellPrice * 0.6;
          const quantity = it.quantity || 0;
          totalCost += quantity * itemCost;
        }
      }

      const netProfit = totalSales - totalCost;
      const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
      const collectionRate = totalSales > 0 ? (totalPaid / totalSales) * 100 : 0;
      const averageOrderValue = numberOfSales > 0 ? totalSales / numberOfSales : 0;

      return { 
        kpi: { 
          totalSales: isNaN(totalSales) ? 0 : totalSales, 
          totalPaid: isNaN(totalPaid) ? 0 : totalPaid, 
          outstandingAmount: isNaN(outstandingAmount) ? 0 : outstandingAmount, 
          numberOfSales, 
          averageOrderValue: isNaN(averageOrderValue) ? 0 : averageOrderValue, 
          profitMargin: isNaN(profitMargin) ? 0 : profitMargin, 
          collectionRate: isNaN(collectionRate) ? 0 : collectionRate, 
          netProfit: isNaN(netProfit) ? 0 : netProfit 
        } 
      };
    } catch (error) {
      console.error('Error computing KPIs for range:', error);
      return { kpi: { totalSales: 0, totalPaid: 0, outstandingAmount: 0, numberOfSales: 0, averageOrderValue: 0, profitMargin: 0, collectionRate: 0, netProfit: 0 } };
    }
  }

  private async getInventorySummary() {
    try {
      const items = await prisma.inventoryItem.findMany();
      const totalItems = items.length;
      const totalValue = items.reduce((sum, it) => {
        const itemValue = (it.sellPrice || it.basePrice || 0) * (it.quantity || 0);
        return sum + (isNaN(itemValue) ? 0 : itemValue);
      }, 0);
      const lowStockItems = items.filter(it => {
        const quantity = it.quantity || 0;
        const limit = it.lowStockLimit || 10;
        return quantity > 0 && quantity <= limit;
      }).length;
      const outOfStock = items.filter(it => (it.quantity || 0) === 0).length;
      
      return { 
        totalItems, 
        totalValue: isNaN(totalValue) ? 0 : totalValue, 
        lowStockItems, 
        outOfStock 
      };
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
      return { totalItems: 0, totalValue: 0, lowStockItems: 0, outOfStock: 0 };
    }
  }

  private async getExpensesTotal(start: Date, end: Date) {
    try {
      const expenses = await prisma.expense.findMany({
        where: { date: { gte: new Date(start), lte: new Date(end) } }
      });
      const total = expenses.reduce((sum, e) => {
        const amount = e.amount || 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      return isNaN(total) ? 0 : total;
    } catch (error) {
      console.error('Error fetching expenses total:', error);
      return 0;
    }
  }
}
