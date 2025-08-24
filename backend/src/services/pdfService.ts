import { format, subDays } from 'date-fns';
import PDFDocument from 'pdfkit';
import prisma from '../lib/prisma';

export class PDFService {
  // Color scheme for modern UI
  private colors = {
    primary: '#2563eb',      // Blue
    secondary: '#64748b',    // Slate
    success: '#059669',      // Green
    warning: '#d97706',      // Amber
    danger: '#dc2626',       // Red
    info: '#0891b2',         // Cyan
    light: '#f8fafc',        // Slate 50
    dark: '#1e293b',         // Slate 800
    white: '#ffffff',
    border: '#e2e8f0',      // Slate 200
    text: '#334155',         // Slate 700
    textLight: '#64748b'    // Slate 500
  };

  async generateDailyReport(date: Date = new Date()): Promise<Buffer> {
    try {
      // Create a new PDF document with improved settings
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Daily Business Report - ${format(date, 'MMM dd, yyyy')}`,
          Author: 'Butchery Management System',
          Subject: 'Daily Business Report',
          Keywords: 'business, report, daily, butchery',
          CreationDate: new Date(),
        }
      });

      // Collect the PDF data chunks
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      
      // When the PDF is finished, resolve with the buffer
      const pdfPromise = new Promise<Buffer>((resolve) => {
        doc.on('end', () => {
          const result = Buffer.concat(chunks);
          resolve(result);
        });
      });

      // Generate the PDF content
      await this.generatePDFContent(doc, date);
      
      // Finalize the PDF
      doc.end();
      
      // Return the generated PDF buffer
      return await pdfPromise;
    } catch (error) {
      console.error('Error generating PDF report:', error);
      
      // Fallback: generate a simple text-based PDF
      return await this.generateFallbackPDF(date);
    }
  }

  private async generatePDFContent(doc: any, date: Date) {
    const startDate = format(subDays(date, 1), 'yyyy-MM-dd');
    const endDate = format(date, 'yyyy-MM-dd');
    
    // Fetch all report data
    const salesData = await this.getSalesData(startDate, endDate);
    const profitLossData = await this.getProfitLossData(startDate, endDate);
    const inventoryData = await this.getInventoryData();
    const cashFlowData = await this.getCashFlowData(startDate, endDate);
    const customerData = await this.getCustomerData(startDate, endDate);
    const expensesData = await this.getExpensesData(startDate, endDate);

    // Modern Header with gradient-like effect
    this.drawModernHeader(doc, date);
    
    // Executive Summary Section
    this.drawExecutiveSummary(doc, salesData, profitLossData);
    
    // Sales Performance Section
    this.drawSalesPerformance(doc, salesData);
    
    // Add page break for next section
    doc.addPage();
    
    // Financial Analysis Section (now includes expenses)
    this.drawFinancialAnalysis(doc, profitLossData, cashFlowData, expensesData);
    
    // Inventory Insights Section
    this.drawInventoryInsights(doc, inventoryData);
    
    // Customer Analytics Section
    this.drawCustomerAnalytics(doc, customerData);
    
    // Footer
    this.drawModernFooter(doc);
  }

  private drawModernHeader(doc: any, date: Date) {
    // Background rectangle for header
    doc.rect(0, 0, doc.page.width, 120)
       .fill(this.colors.light);
    
    // Company logo placeholder (you can add actual logo image here)
    doc.circle(60, 60, 25)
       .fill(this.colors.primary);
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.white)
       .text('BMS', 50, 50, { align: 'center' });
    
    // Main title
    doc.fontSize(28)
       .font('Helvetica-Bold')
       .fill(this.colors.dark)
       .text('Daily Business Report', 100, 30);
    
    // Date
    doc.fontSize(18)
       .font('Helvetica')
       .fill(this.colors.text)
       .text(format(date, 'EEEE, MMMM dd, yyyy'), 100, 60);
    
    // Generated timestamp
    doc.fontSize(12)
       .font('Helvetica-Oblique')
       .fill(this.colors.textLight)
       .text(`Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm:ss')}`, 100, 85);
    
    // Reset position
    doc.y = 140;
  }

  private drawExecutiveSummary(doc: any, salesData: any, profitLossData: any) {
    // Section header
    this.drawSectionHeader(doc, '📊 Executive Summary', 'Key performance indicators for today');
    
    // KPI Cards in modern grid
    const kpiData = [
      {
        title: 'Total Sales',
        value: `KSH ${salesData.summary?.totalSales?.toLocaleString() || '0'}`,
        icon: '💰',
        color: this.colors.primary
      },
      {
        title: 'Net Profit',
        value: `KSH ${salesData.summary?.netProfit?.toLocaleString() || '0'}`,
        icon: '📈',
        color: this.colors.success
      },
      {
        title: 'Transactions',
        value: `${salesData.summary?.numberOfSales || '0'}`,
        icon: '🛒',
        color: this.colors.info
      },
      {
        title: 'Profit Margin',
        value: `${salesData.summary?.profitMargin?.toFixed(1) || '0'}%`,
        icon: '🎯',
        color: this.colors.warning
      }
    ];

    this.drawKPICards(doc, kpiData);
    doc.moveDown(1);
  }

  private drawSalesPerformance(doc: any, salesData: any) {
    // Section header
    this.drawSectionHeader(doc, '🏆 Sales Performance', 'Detailed sales analysis and top performers');
    
    // Sales metrics in modern cards
    const salesMetrics = [
      ['Total Collected', `KSH ${salesData.summary?.totalPaid?.toLocaleString() || '0'}`, this.colors.success],
      ['Outstanding', `KSH ${salesData.summary?.outstandingAmount?.toLocaleString() || '0'}`, this.colors.warning],
      ['Collection Rate', `${salesData.summary?.collectionRate?.toFixed(1) || '0'}%`, this.colors.info],
      ['Avg Order Value', `KSH ${salesData.summary?.averageOrderValue?.toLocaleString() || '0'}`, this.colors.primary]
    ];

    this.drawModernMetricsGrid(doc, salesMetrics);
    doc.moveDown(1);

    // Top Selling Items with improved table
    if (salesData.topItems && salesData.topItems.length > 0) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fill(this.colors.dark)
         .text('🔥 Top Selling Items');
      
      doc.moveDown(0.5);
      
      const topItemsData = salesData.topItems.slice(0, 8).map((item: any, index: number) => [
        `${index + 1}`,
        item.name || 'Unknown Item',
        item.quantity?.toFixed(2) || '0',
        `KSH ${item.revenue?.toLocaleString() || '0'}`,
        `KSH ${item.profit?.toLocaleString() || '0'}`
      ]);
      
      const topItemsHeaders = ['Rank', 'Item', 'Quantity', 'Revenue', 'Profit'];
      this.drawModernDataTable(doc, [topItemsHeaders, ...topItemsData]);
      doc.moveDown(1);
    }

    // Recent Sales with modern styling
    if (salesData.recentSales && salesData.recentSales.length > 0) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fill(this.colors.dark)
         .text('🕒 Recent Transactions');
      
      doc.moveDown(0.5);
      
      const recentSalesData = salesData.recentSales.slice(0, 8).map((sale: any) => [
        `#${sale.id}`,
        sale.customer || 'Unknown Customer',
        `KSH ${sale.amount?.toLocaleString() || '0'}`,
        sale.paymentType || 'Unknown',
        format(new Date(sale.date), 'MMM dd, HH:mm')
      ]);
      
      const recentSalesHeaders = ['ID', 'Customer', 'Amount', 'Payment', 'Time'];
      this.drawModernDataTable(doc, [recentSalesHeaders, ...recentSalesData]);
      doc.moveDown(1);
    }
  }

  private drawFinancialAnalysis(doc: any, profitLossData: any, cashFlowData: any, expensesData?: any) {
    // Section header
    this.drawSectionHeader(doc, '💰 Financial Analysis', 'Profit & Loss and Cash Flow insights');
    
    // Profit & Loss metrics
    const profitLossMetrics = [
      ['Total Revenue', `KSH ${profitLossData.summary?.totalRevenue?.toLocaleString() || '0'}`, this.colors.success],
      ['Total Cost', `KSH ${profitLossData.summary?.totalCost?.toLocaleString() || '0'}`, this.colors.danger],
      ['Total Profit', `KSH ${profitLossData.summary?.totalProfit?.toLocaleString() || '0'}`, this.colors.primary],
      ['Profit Margin', `${profitLossData.summary?.profitMargin?.toFixed(1) || '0'}%`, this.colors.warning]
    ];

    this.drawModernMetricsGrid(doc, profitLossMetrics);
    doc.moveDown(1);

    // Expenses summary
    if (expensesData) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fill(this.colors.dark)
         .text('💸 Expenses Summary');
      doc.moveDown(0.5);

      const expenseMetrics = [
        ['Total Expenses', `KSH ${expensesData.summary?.totalAmount?.toLocaleString() || '0'}`, this.colors.danger],
        ['Transactions', `${expensesData.summary?.count || '0'}`, this.colors.info]
      ];
      this.drawModernMetricsGrid(doc, expenseMetrics);
      doc.moveDown(0.5);

      if (expensesData.topCategories?.length) {
        const expRows = expensesData.topCategories.map((c: any) => [c.category, `KSH ${c.amount.toLocaleString()}`]);
        this.drawModernDataTable(doc, [['Category', 'Amount'], ...expRows]);
        doc.moveDown(1);
      }
    }

    // Cash Flow metrics
    const cashFlowMetrics = [
      ['Cash Inflow', `KSH ${cashFlowData.summary?.totalInflow?.toLocaleString() || '0'}`, this.colors.success],
      ['Cash Outflow', `KSH ${cashFlowData.summary?.totalOutflow?.toLocaleString() || '0'}`, this.colors.danger],
      ['Net Cash Flow', `KSH ${cashFlowData.summary?.netCashFlow?.toLocaleString() || '0'}`, this.colors.primary],
      ['Collection Rate', `${cashFlowData.summary?.collectionRate?.toFixed(1) || '0'}%`, this.colors.info]
    ];

    this.drawModernMetricsGrid(doc, cashFlowMetrics);
    doc.moveDown(1);
  }

  private drawInventoryInsights(doc: any, inventoryData: any) {
    // Section header
    this.drawSectionHeader(doc, '📦 Inventory Insights', 'Stock levels and inventory performance');
    
    // Inventory metrics
    const inventoryMetrics = [
      ['Total Items', `${inventoryData.summary?.totalItems || '0'}`, this.colors.info],
      ['Low Stock Items', `${inventoryData.summary?.lowStockItems || '0'}`, this.colors.warning],
      ['Out of Stock', `${inventoryData.summary?.outOfStock || '0'}`, this.colors.danger],
      ['Total Value', `KSH ${inventoryData.summary?.totalValue?.toLocaleString() || '0'}`, this.colors.primary]
    ];

    this.drawModernMetricsGrid(doc, inventoryMetrics);
    doc.moveDown(1);

    // Low Stock Alerts
    if (inventoryData.lowStockAlerts && inventoryData.lowStockAlerts.length > 0) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fill(this.colors.warning)
         .text('⚠️ Low Stock Alerts');
      
      doc.moveDown(0.5);
      
      const lowStockData = inventoryData.lowStockAlerts.slice(0, 6).map((item: any) => [
        item.name || 'Unknown Item',
        item.category || 'General',
        item.quantity?.toString() || '0',
        item.lowStockLimit?.toString() || '0',
        item.unit || 'units'
      ]);
      
      const lowStockHeaders = ['Item', 'Category', 'Current Stock', 'Min Required', 'Unit'];
      this.drawModernDataTable(doc, [lowStockHeaders, ...lowStockData]);
      doc.moveDown(1);
    }
  }

  private drawCustomerAnalytics(doc: any, customerData: any) {
    // Section header
    this.drawSectionHeader(doc, '👥 Customer Analytics', 'Customer behavior and debt analysis');
    
    // Customer metrics
    const customerMetrics = [
      ['Total Customers', `${customerData.summary?.totalCustomers || '0'}`, this.colors.info],
      ['Active Customers', `${customerData.summary?.activeCustomers || '0'}`, this.colors.success],
      ['New Customers', `${customerData.summary?.newCustomers || '0'}`, this.colors.primary],
      ['Avg Order Value', `KSH ${customerData.summary?.averageOrderValue?.toLocaleString() || '0'}`, this.colors.warning]
    ];

    this.drawModernMetricsGrid(doc, customerMetrics);
    doc.moveDown(1);

    // Debt Summary
    if (customerData.debtSummary) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fill(this.colors.danger)
         .text('💳 Outstanding Debts');
      
      doc.moveDown(0.5);
      
      const debtMetrics = [
        ['Total Outstanding', `KSH ${customerData.debtSummary.totalOutstanding?.toLocaleString() || '0'}`, this.colors.danger],
        ['Customers in Debt', `${customerData.debtSummary.customerCount || '0'}`, this.colors.warning],
        ['Average Debt', `KSH ${customerData.debtSummary.averageDebt?.toFixed(0) || '0'}`, this.colors.secondary]
      ];

      this.drawModernMetricsGrid(doc, debtMetrics);
      doc.moveDown(1);

      // Top Debtors
      if (customerData.debtSummary.topDebtors && customerData.debtSummary.topDebtors.length > 0) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fill(this.colors.dark)
           .text('Top Debtors');
        
        doc.moveDown(0.5);
        
                 const debtorsData = customerData.debtSummary.topDebtors.slice(0, 5).map((debtor: any) => [
          debtor.name || 'Unknown Customer',
          `KSH ${Math.abs(debtor.balance || 0).toLocaleString()}`,
          debtor.balance < 0 ? 'Outstanding' : 'Credit'
        ]);
        
        const debtorsHeaders = ['Customer', 'Amount', 'Status'];
        this.drawModernDataTable(doc, [debtorsHeaders, ...debtorsData]);
        doc.moveDown(1);
      }
    }
  }

  private drawModernFooter(doc: any) {
    // Footer background
    doc.rect(0, doc.page.height - 80, doc.page.width, 80)
       .fill(this.colors.light);
    
    // Footer content
    doc.fontSize(10)
       .font('Helvetica-Oblique')
       .fill(this.colors.textLight)
       .text('This report was automatically generated by the Butchery Management System.', { align: 'center' });
    
    doc.moveDown(0.5);
    doc.text('For questions or support, please contact your system administrator.', { align: 'center' });
    
    // Page number
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text(`Page ${doc.bufferedPageRange().count}`, { align: 'center' });
  }

  private drawSectionHeader(doc: any, title: string, subtitle: string) {
    // Section background
    doc.rect(0, doc.y - 10, doc.page.width - 80, 50)
       .fill(this.colors.primary + '10');
    
    // Section title
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text(title, 0, doc.y);
    
    // Section subtitle
    doc.fontSize(12)
       .font('Helvetica')
       .fill(this.colors.textLight)
       .text(subtitle, 0, doc.y + 25);
    
    doc.y += 60;
  }

  private drawKPICards(doc: any, kpiData: any[]) {
    const pageWidth = doc.page.width - 80;
    const cardWidth = pageWidth / 2;
    const cardHeight = 60;
    const startX = doc.x;
    const startY = doc.y;
    
    kpiData.forEach((kpi, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = startX + (col * cardWidth);
      const y = startY + (row * (cardHeight + 10));
      
      // Card background with shadow effect
      doc.rect(x + 2, y + 2, cardWidth - 4, cardHeight - 4)
         .fill(this.colors.white);
      
      doc.rect(x, y, cardWidth, cardHeight)
         .fill(this.colors.white)
         .stroke(this.colors.border);
      
      // Icon
      doc.fontSize(20)
         .text(kpi.icon, x + 15, y + 10);
      
      // Title
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fill(this.colors.text)
         .text(kpi.title, x + 45, y + 10, {
           width: cardWidth - 60,
           align: 'left'
         });
      
      // Value
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fill(kpi.color)
         .text(kpi.value, x + 15, y + 35, {
           width: cardWidth - 30,
           align: 'left'
         });
    });
    
    // Update document position
    const rows = Math.ceil(kpiData.length / 2);
    doc.y = startY + (rows * (cardHeight + 10)) + 20;
  }

  private drawModernMetricsGrid(doc: any, data: string[][]) {
    const pageWidth = doc.page.width - 80;
    const colWidth = pageWidth / 2;
    const rowHeight = 35;
    const startX = doc.x;
    const startY = doc.y;
    
    data.forEach((row, rowIndex) => {
      const y = startY + (rowIndex * rowHeight);
      
      // Draw background rectangle for each metric
      doc.rect(startX, y, colWidth, rowHeight)
         .fill(this.colors.light);
      
      // Draw border
      doc.rect(startX, y, colWidth, rowHeight)
         .stroke(this.colors.border);
      
      // Add label
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fill(this.colors.text)
         .text(row[0], startX + 10, y + 5, {
           width: colWidth - 20,
           align: 'left'
         });
      
      // Add value with color
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fill(row[2] || this.colors.primary)
         .text(row[1], startX + 10, y + 18, {
           width: colWidth - 20,
           align: 'left'
         });
    });
    
    // Update document position
    doc.y = startY + (data.length * rowHeight) + 15;
  }

  private drawModernDataTable(doc: any, data: string[][]) {
    if (data.length === 0) return;
    
    const pageWidth = doc.page.width - 80;
    const colCount = data[0].length;
    const colWidth = pageWidth / colCount;
    const rowHeight = 28;
    const startX = doc.x;
    const startY = doc.y;
    
    // Draw header row with modern styling
    const headerY = startY;
    doc.rect(startX, headerY, pageWidth, rowHeight)
       .fill(this.colors.primary);
    doc.rect(startX, headerY, pageWidth, rowHeight)
       .stroke(this.colors.primary);
    
    // Add header text
    data[0].forEach((header, colIndex) => {
      const x = startX + (colIndex * colWidth);
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fill(this.colors.white)
         .text(header, x + 8, headerY + 7, {
           width: colWidth - 16,
           align: 'left'
         });
    });
    
    // Draw data rows with modern styling
    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      const y = startY + (rowIndex * rowHeight);
      
      // Alternate row colors
      if (rowIndex % 2 === 0) {
        doc.rect(startX, y, pageWidth, rowHeight)
           .fill(this.colors.light);
      }
      
      // Draw row border
      doc.rect(startX, y, pageWidth, rowHeight)
         .stroke(this.colors.border);
      
      // Add row data
      row.forEach((cell, colIndex) => {
        const x = startX + (colIndex * colWidth);
        doc.fontSize(9)
           .font('Helvetica')
           .fill(this.colors.text)
           .text(cell, x + 8, y + 7, {
             width: colWidth - 16,
             align: 'left'
           });
      });
    }
    
    // Update document position
    doc.y = startY + (data.length * rowHeight) + 15;
  }

  private async getDebtSummaryData() {
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
      }).filter(customer => customer.balance < 0);

      if (debtData.length === 0) {
        return null;
      }

      const totalOutstanding = debtData.reduce((sum, customer) => sum + Math.abs(customer.balance), 0);
      const customerCount = debtData.length;
      const averageDebt = totalOutstanding / customerCount;
      
      const topDebtors = [...debtData].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

      return {
        totalOutstanding,
        customerCount,
        averageDebt,
        topDebtors
      };
    } catch (error) {
      console.error('Error fetching debt summary data:', error);
      return null;
    }
  }

  private async getSalesData(startDate: string, endDate: string) {
    try {
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        include: {
          customer: true,
          items: {
            include: {
              item: true,
            },
          },
        },
      });

      const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const totalPaid = sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
      const outstandingAmount = totalSales - totalPaid;
      const numberOfSales = sales.length;
      
      let totalCost = 0;
      sales.forEach(sale => {
        sale.items.forEach(item => {
          const itemCost = (item.item as any).basePrice || item.price * 0.7;
          totalCost += item.quantity * itemCost;
        });
      });
      
      const netProfit = totalSales - totalCost;
      const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
      const collectionRate = totalSales > 0 ? (totalPaid / totalSales) * 100 : 0;
      const averageOrderValue = numberOfSales > 0 ? totalSales / numberOfSales : 0;

      // Top items
      const itemSales: Record<string, { quantity: number; revenue: number; profit: number; cost: number }> = {};
      sales.forEach(sale => {
        sale.items.forEach(item => {
          if (!itemSales[item.item.name]) {
            itemSales[item.item.name] = { quantity: 0, revenue: 0, profit: 0, cost: 0 };
          }
          const itemCost = (item.item as any).basePrice || item.price * 0.7;
          itemSales[item.item.name].quantity += item.quantity;
          itemSales[item.item.name].revenue += item.quantity * item.price;
          itemSales[item.item.name].cost += item.quantity * itemCost;
          itemSales[item.item.name].profit += item.quantity * (item.price - itemCost);
        });
      });

      const topItems = Object.entries(itemSales)
        .map(([name, data]) => ({
          name,
          quantity: data.quantity,
          revenue: data.revenue,
          profit: data.profit
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Recent sales
      const recentSales = sales
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map(sale => ({
          id: sale.id,
          customer: sale.customer?.name || 'Unknown Customer',
          amount: sale.totalAmount,
          paid: sale.paidAmount,
          paymentType: sale.paymentType,
          date: sale.createdAt
        }));

      return {
        summary: {
          totalSales,
          totalPaid,
          outstandingAmount,
          numberOfSales,
          netProfit,
          profitMargin,
          collectionRate,
          averageOrderValue
        },
        topItems,
        recentSales
      };
    } catch (error) {
      console.error('Error fetching sales data:', error);
      return { summary: {}, topItems: [], recentSales: [] };
    }
  }

  private async getProfitLossData(startDate: string, endDate: string) {
    try {
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        include: {
          items: {
            include: {
              item: true,
            },
          },
        },
      });

      let totalRevenue = 0;
      let totalCost = 0;
      const itemPerformance: Record<string, { 
        name: string; 
        category: string; 
        totalQuantity: number; 
        totalRevenue: number; 
        totalProfit: number; 
        totalCost: number 
      }> = {};

      sales.forEach(sale => {
        sale.items.forEach(item => {
          const itemCost = (item.item as any).basePrice || item.price * 0.7;
          const revenue = item.quantity * item.price;
          const cost = item.quantity * itemCost;
          const profit = revenue - cost;

          totalRevenue += revenue;
          totalCost += cost;

          if (!itemPerformance[item.item.name]) {
            itemPerformance[item.item.name] = {
              name: item.item.name,
              category: item.item.category || 'General',
              totalQuantity: 0,
              totalRevenue: 0,
              totalProfit: 0,
              totalCost: 0
            };
          }

          itemPerformance[item.item.name].totalQuantity += item.quantity;
          itemPerformance[item.item.name].totalRevenue += revenue;
          itemPerformance[item.item.name].totalProfit += profit;
          itemPerformance[item.item.name].totalCost += cost;
        });
      });

      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      const topPerformers = Object.values(itemPerformance)
        .map(item => ({
          ...item,
          profitMargin: item.totalRevenue > 0 ? (item.totalProfit / item.totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.totalProfit - a.totalProfit)
        .slice(0, 10);

      return {
        summary: {
          totalRevenue,
          totalCost,
          totalProfit,
          profitMargin
        },
        topPerformers
      };
    } catch (error) {
      console.error('Error fetching profit/loss data:', error);
      return { summary: {}, topPerformers: [] };
    }
  }

  private async getInventoryData() {
    try {
      const inventory = await prisma.inventoryItem.findMany();
      
      const totalItems = inventory.length;
      const totalValue = inventory.reduce((sum, item) => {
        const itemValue = (item.sellPrice || item.basePrice || 0) * item.quantity;
        return sum + itemValue;
      }, 0);
      
      const lowStockItems = inventory.filter(item => 
        item.quantity <= (item.lowStockLimit || 10)
      ).length;
      
      const outOfStock = inventory.filter(item => item.quantity === 0).length;
      
      const lowStockAlerts = inventory
        .filter(item => item.quantity <= (item.lowStockLimit || 10))
        .map(item => ({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          lowStockLimit: item.lowStockLimit || 10,
          unit: item.unit
        }))
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 10);

      return {
        summary: {
          totalItems,
          totalValue,
          lowStockItems,
          outOfStock
        },
        lowStockAlerts
      };
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      return { summary: {}, lowStockAlerts: [] };
    }
  }

  private async getCashFlowData(startDate: string, endDate: string) {
    try {
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      });

      // Include expenses as outflows for the cash flow statement
      const expenses = await prisma.expense.findMany({
        where: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      });

      const totalInflow = sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
      const totalOutflow = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      const netCashFlow = totalInflow - totalOutflow;
      const totalSalesAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const collectionRate = totalSalesAmount > 0 ? (totalInflow / totalSalesAmount) * 100 : 0;

      return {
        summary: {
          totalInflow,
          totalOutflow,
          netCashFlow,
          collectionRate
        }
      };
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
      return { summary: {} };
    }
  }

  private async getCustomerData(startDate: string, endDate: string) {
    try {
      const customers = await prisma.customer.findMany({
        include: {
          sales: {
            where: {
              createdAt: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            },
          },
        },
      });

      const totalCustomers = customers.length;
      const activeCustomers = customers.filter(c => c.sales.length > 0).length;
      const newCustomers = customers.filter(c => 
        new Date(c.createdAt) >= new Date(startDate)
      ).length;

      const totalSales = customers.reduce((sum, c) => 
        sum + c.sales.reduce((saleSum, sale) => saleSum + sale.totalAmount, 0), 0
      );
      const averageOrderValue = totalSales / Math.max(activeCustomers, 1);

      // Get debt summary
      const debtSummary = await this.getDebtSummaryData();

      return {
        summary: {
          totalCustomers,
          activeCustomers,
          newCustomers,
          averageOrderValue
        },
        debtSummary
             };
     } catch (error) {
       console.error('Error fetching customer data:', error);
       return { summary: {}, debtSummary: null };
     }
   }

  private async getExpensesData(startDate: string, endDate: string) {
    try {
      const expenses = await prisma.expense.findMany({
        where: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        orderBy: { date: 'desc' }
      });

      const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const byCategory: Record<string, number> = {};
      expenses.forEach(e => {
        const cat = e.category || 'General';
        byCategory[cat] = (byCategory[cat] || 0) + (e.amount || 0);
      });

      const topCategories = Object.entries(byCategory)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6);

      return { summary: { totalAmount, count: expenses.length }, topCategories, recent: expenses.slice(0, 8) };
    } catch (error) {
      console.error('Error fetching expenses data:', error);
      return { summary: {}, topCategories: [], recent: [] };
    }
  }


  private async generateFallbackPDF(date: Date): Promise<Buffer> {
    const reportDate = format(date, 'EEEE, MMMM dd, yyyy');
    const currentTime = format(new Date(), 'MMM dd, yyyy HH:mm:ss');
    
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Daily Business Report - ${format(date, 'MMM dd, yyyy')}`,
        Author: 'Butchery Management System',
        Subject: 'Daily Business Report',
        Keywords: 'business, report, daily, butchery',
        CreationDate: new Date(),
      }
    });

    // Collect the PDF data chunks
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    
    // When the PDF is finished, resolve with the buffer
    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        resolve(result);
      });
    });

    // Header
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('DAILY BUSINESS REPORT', { align: 'center' });
    
    doc.moveDown(0.5);
    doc.fontSize(14)
       .font('Helvetica')
       .text(reportDate, { align: 'center' });
    
    doc.moveDown(0.5);
    doc.fontSize(10)
       .font('Helvetica-Oblique')
       .text(`Generated on: ${currentTime}`, { align: 'center' });
    
    doc.moveDown(2);

    // Error message
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fill('#dc3545')
       .text('⚠️ PDF Generation Error', { align: 'center' });
    
    doc.moveDown(1);
    doc.fontSize(12)
       .font('Helvetica')
       .fill('#6c757d')
       .text('The system encountered an error while generating your detailed business report.', { align: 'center' });
    
    doc.moveDown(0.5);
    doc.text('Please try again later or contact your system administrator for assistance.', { align: 'center' });

    doc.moveDown(2);
    
    // Instructions
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fill('#495057')
       .text('What you can do:', { align: 'left' });
    
    doc.moveDown(0.5);
    doc.fontSize(10)
       .font('Helvetica')
       .fill('#6c757d')
       .text('• Try generating the report again in a few minutes', { align: 'left' });
    doc.moveDown(0.3);
    doc.text('• Check your internet connection', { align: 'left' });
    doc.moveDown(0.3);
    doc.text('• Contact your system administrator if the issue persists', { align: 'left' });
    doc.moveDown(0.3);
    doc.text('• Use the web interface to view your business data', { align: 'left' });

    // Footer
    doc.moveDown(2);
    doc.fontSize(10)
       .font('Helvetica-Oblique')
       .fill('#6c757d')
       .text('This report was automatically generated by the Butchery Management System.', { align: 'center' });
    
    doc.moveDown(0.5);
    doc.text('For questions or support, please contact your system administrator.', { align: 'center' });

    doc.end();
    return await pdfPromise;
  }
}
