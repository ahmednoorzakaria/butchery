import { format, subDays } from 'date-fns';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import prisma from '../lib/prisma';
import { HTMLTemplates } from './htmlTemplates';
import fs from 'fs';
import path from 'path';

export class ProfessionalReportService {
  private colors = {
    primary: '#2563eb',
    secondary: '#64748b',
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#0891b2',
    light: '#f8fafc',
    dark: '#1e293b',
    white: '#ffffff',
    border: '#e2e8f0',
    text: '#334155',
    textLight: '#64748b'
  };

  async generateExcelReport(date: Date = new Date()): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Butchery Management System';
      workbook.lastModifiedBy = 'BMS';
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.lastPrinted = new Date();

      // Add metadata
      workbook.properties.date1904 = false;

      // Create worksheets
      await this.createExecutiveSummarySheet(workbook, date);
      await this.createSalesAnalysisSheet(workbook, date);
      await this.createFinancialAnalysisSheet(workbook, date);
      await this.createInventorySheet(workbook, date);
      await this.createCustomerAnalysisSheet(workbook, date);
      await this.createExpensesSheet(workbook, date);

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      console.error('Error generating Excel report:', error);
      throw error;
    }
  }

  async generateHTMLPDFReport(date: Date = new Date()): Promise<Buffer> {
    try {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Generate HTML content
      const htmlContent = await this.generateHTMLContent(date);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Set viewport for better rendering
      await page.setViewport({ width: 1200, height: 1600 });
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });

      await browser.close();
      return pdfBuffer;
    } catch (error) {
      console.error('Error generating HTML PDF report:', error);
      throw error;
    }
  }

  private async createExecutiveSummarySheet(workbook: ExcelJS.Workbook, date: Date) {
    const worksheet = workbook.addWorksheet('Executive Summary');
    
    // Set column widths
    worksheet.columns = [
      { key: 'metric', width: 25 },
      { key: 'value', width: 20 },
      { key: 'change', width: 15 },
      { key: 'status', width: 15 }
    ];

    // Add title
    const titleRow = worksheet.addRow(['']);
    titleRow.height = 30;
    const titleCell = titleRow.getCell(1);
    titleCell.value = `Daily Business Report - ${format(date, 'MMMM dd, yyyy')}`;
    titleCell.font = { size: 18, bold: true, color: { argb: 'FF2563EB' } };
    titleCell.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A1:D1');

    // Add subtitle
    const subtitleRow = worksheet.addRow(['']);
    subtitleRow.height = 20;
    const subtitleCell = subtitleRow.getCell(1);
    subtitleCell.value = `Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}`;
    subtitleCell.font = { size: 12, italic: true, color: { argb: 'FF64748B' } };
    subtitleCell.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A2:D2');

    // Add KPI section
    worksheet.addRow(['']);
    worksheet.addRow(['Key Performance Indicators', '', '', '']);
    const kpiHeaderRow = worksheet.getRow(4);
    kpiHeaderRow.font = { size: 14, bold: true, color: { argb: 'FF1E293B' } };
    kpiHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }
    };

    // Get KPI data
    const kpiData = await this.getKPIData(date);
    
    // Add KPI rows
    worksheet.addRow(['Total Sales', `KSH ${kpiData.totalSales.toLocaleString()}`, '', '']);
    worksheet.addRow(['Net Profit', `KSH ${kpiData.netProfit.toLocaleString()}`, '', '']);
    worksheet.addRow(['Transactions', kpiData.transactions.toString(), '', '']);
    worksheet.addRow(['Profit Margin', `${kpiData.profitMargin.toFixed(1)}%`, '', '']);
    worksheet.addRow(['Collection Rate', `${kpiData.collectionRate.toFixed(1)}%`, '', '']);
    worksheet.addRow(['Average Order Value', `KSH ${kpiData.averageOrderValue.toLocaleString()}`, '', '']);

    // Style KPI rows
    for (let i = 5; i <= 10; i++) {
      const row = worksheet.getRow(i);
      row.getCell(1).font = { bold: true };
      row.getCell(2).font = { bold: true, color: { argb: 'FF2563EB' } };
    }

    // Add summary section
    worksheet.addRow(['']);
    worksheet.addRow(['Business Summary', '', '', '']);
    const summaryHeaderRow = worksheet.getRow(12);
    summaryHeaderRow.font = { size: 14, bold: true, color: { argb: 'FF1E293B' } };
    summaryHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }
    };

    worksheet.addRow(['Total Revenue', `KSH ${kpiData.totalRevenue.toLocaleString()}`, '', '']);
    worksheet.addRow(['Total Cost', `KSH ${kpiData.totalCost.toLocaleString()}`, '', '']);
    worksheet.addRow(['Outstanding Amount', `KSH ${kpiData.outstandingAmount.toLocaleString()}`, '', '']);

    // Style summary rows
    for (let i = 13; i <= 15; i++) {
      const row = worksheet.getRow(i);
      row.getCell(1).font = { bold: true };
      row.getCell(2).font = { bold: true };
    }

    // Add borders
    this.addBorders(worksheet, 4, 15);
  }

  private async createSalesAnalysisSheet(workbook: ExcelJS.Workbook, date: Date) {
    const worksheet = workbook.addWorksheet('Sales Analysis');
    
    // Set column widths
    worksheet.columns = [
      { key: 'rank', width: 8 },
      { key: 'item', width: 30 },
      { key: 'category', width: 20 },
      { key: 'quantity', width: 15 },
      { key: 'revenue', width: 20 },
      { key: 'profit', width: 20 },
      { key: 'margin', width: 15 }
    ];

    // Add title
    const titleRow = worksheet.addRow(['']);
    titleRow.height = 30;
    const titleCell = titleRow.getCell(1);
    titleCell.value = 'Sales Performance Analysis';
    titleCell.font = { size: 18, bold: true, color: { argb: 'FF059669' } };
    titleCell.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A1:G1');

    // Add headers
    const headers = ['Rank', 'Item Name', 'Category', 'Quantity', 'Revenue (KSH)', 'Profit (KSH)', 'Margin %'];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' }
    };
    headerRow.alignment = { horizontal: 'center' };

    // Get sales data
    const salesData = await this.getSalesData(date);
    
    // Add data rows
    salesData.topItems.forEach((item, index) => {
      const row = worksheet.addRow([
        index + 1,
        item.name,
        item.category || 'General',
        item.quantity,
        item.revenue,
        item.profit,
        item.profitMargin
      ]);

      // Style the row
      row.getCell(1).font = { bold: true };
      row.getCell(4).numFmt = '#,##0.00';
      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '#,##0.00';
      row.getCell(7).numFmt = '0.0%';
    });

    // Add recent transactions
    worksheet.addRow(['']);
    worksheet.addRow(['Recent Transactions', '', '', '', '', '', '']);
    const recentHeaderRow = worksheet.getRow(salesData.topItems.length + 4);
    recentHeaderRow.font = { size: 14, bold: true, color: { argb: 'FF1E293B' } };
    recentHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }
    };

    // Add transaction headers
    const transactionHeaders = ['ID', 'Customer', 'Amount', 'Payment Type', 'Date', 'Status'];
    const transactionHeaderRow = worksheet.addRow(transactionHeaders);
    transactionHeaderRow.font = { bold: true };
    transactionHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }
    };

    // Add transaction data
    salesData.recentSales.forEach(sale => {
      worksheet.addRow([
        sale.id,
        sale.customer,
        sale.amount,
        sale.paymentType,
        format(new Date(sale.date), 'MMM dd, yyyy'),
        sale.paid === sale.amount ? 'Paid' : 'Partial'
      ]);
    });

    // Add borders
    this.addBorders(worksheet, 2, salesData.topItems.length + 2);
    this.addBorders(worksheet, salesData.topItems.length + 5, worksheet.rowCount);
  }

  private async createFinancialAnalysisSheet(workbook: ExcelJS.Workbook, date: Date) {
    const worksheet = workbook.addWorksheet('Financial Analysis');
    
    // Set column widths
    worksheet.columns = [
      { key: 'metric', width: 25 },
      { key: 'amount', width: 20 },
      { key: 'percentage', width: 15 },
      { key: 'trend', width: 15 }
    ];

    // Add title
    const titleRow = worksheet.addRow(['']);
    titleRow.height = 30;
    const titleCell = titleRow.getCell(1);
    titleCell.value = 'Financial Performance & Cash Flow';
    titleCell.font = { size: 18, bold: true, color: { argb: 'FFDC2626' } };
    titleCell.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A1:D1');

    // Get financial data
    const financialData = await this.getFinancialData(date);
    
    // Add Profit & Loss section
    worksheet.addRow(['']);
    worksheet.addRow(['Profit & Loss Statement', '', '', '']);
    const plHeaderRow = worksheet.getRow(3);
    plHeaderRow.font = { size: 14, bold: true, color: { argb: 'FF1E293B' } };
    plHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFEF2F2' }
    };

    worksheet.addRow(['Total Revenue', financialData.totalRevenue, '', '']);
    worksheet.addRow(['Total Cost of Goods', financialData.totalCost, '', '']);
    worksheet.addRow(['Gross Profit', financialData.grossProfit, '', '']);
    worksheet.addRow(['Operating Expenses', financialData.expenses, '', '']);
    worksheet.addRow(['Net Profit', financialData.netProfit, '', '']);

    // Style P&L rows
    for (let i = 4; i <= 8; i++) {
      const row = worksheet.getRow(i);
      row.getCell(1).font = { bold: true };
      row.getCell(2).numFmt = '#,##0.00';
    }

    // Add Cash Flow section
    worksheet.addRow(['']);
    worksheet.addRow(['Cash Flow Analysis', '', '', '']);
    const cfHeaderRow = worksheet.getRow(10);
    cfHeaderRow.font = { size: 14, bold: true, color: { argb: 'FF1E293B' } };
    cfHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F9FF' }
    };

    worksheet.addRow(['Cash Inflow', financialData.cashInflow, '', '']);
    worksheet.addRow(['Cash Outflow', financialData.cashOutflow, '', '']);
    worksheet.addRow(['Net Cash Flow', financialData.netCashFlow, '', '']);
    worksheet.addRow(['Collection Rate', '', `${financialData.collectionRate.toFixed(1)}%`, '']);

    // Style Cash Flow rows
    for (let i = 11; i <= 14; i++) {
      const row = worksheet.getRow(i);
      row.getCell(1).font = { bold: true };
      if (i <= 13) {
        row.getCell(2).numFmt = '#,##0.00';
      }
    }

    // Add borders
    this.addBorders(worksheet, 3, 8);
    this.addBorders(worksheet, 10, 14);
  }

  private async createInventorySheet(workbook: ExcelJS.Workbook, date: Date) {
    const worksheet = workbook.addWorksheet('Inventory Status');
    
    // Set column widths
    worksheet.columns = [
      { key: 'item', width: 30 },
      { key: 'category', width: 20 },
      { key: 'quantity', width: 15 },
      { key: 'unit', width: 10 },
      { key: 'minStock', width: 15 },
      { key: 'status', width: 15 },
      { key: 'value', width: 20 }
    ];

    // Add title
    const titleRow = worksheet.addRow(['']);
    titleRow.height = 30;
    const titleCell = titleRow.getCell(1);
    titleCell.value = 'Inventory Status & Alerts';
    titleCell.font = { size: 18, bold: true, color: { argb: 'FFD97706' } };
    titleCell.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A1:G1');

    // Add headers
    const headers = ['Item Name', 'Category', 'Current Stock', 'Unit', 'Min Stock', 'Status', 'Stock Value (KSH)'];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD97706' }
    };
    headerRow.alignment = { horizontal: 'center' };

    // Get inventory data
    const inventoryData = await this.getInventoryData();
    
    // Add inventory rows
    inventoryData.items.forEach(item => {
      const status = this.getStockStatus(item.quantity, item.lowStockLimit);
      const row = worksheet.addRow([
        item.name,
        item.category || 'General',
        item.quantity,
        item.unit || 'units',
        item.lowStockLimit || 10,
        status,
        item.stockValue
      ]);

      // Style based on status
      if (status === 'Low Stock') {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
      } else if (status === 'Out of Stock') {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
      }
    });

    // Add summary section
    worksheet.addRow(['']);
    worksheet.addRow(['Inventory Summary', '', '', '', '', '', '']);
    const summaryHeaderRow = worksheet.getRow(inventoryData.items.length + 3);
    summaryHeaderRow.font = { size: 14, bold: true, color: { argb: 'FF1E293B' } };
    summaryHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }
    };

    worksheet.addRow(['Total Items', inventoryData.summary.totalItems, '', '', '', '', '']);
    worksheet.addRow(['Low Stock Items', inventoryData.summary.lowStockItems, '', '', '', '', '']);
    worksheet.addRow(['Out of Stock', inventoryData.summary.outOfStock, '', '', '', '', '']);
    worksheet.addRow(['Total Stock Value', '', '', '', '', '', inventoryData.summary.totalValue]);

    // Style summary rows
    for (let i = inventoryData.items.length + 4; i <= inventoryData.items.length + 7; i++) {
      const row = worksheet.getRow(i);
      row.getCell(1).font = { bold: true };
      if (i === inventoryData.items.length + 7) {
        row.getCell(7).numFmt = '#,##0.00';
      }
    }

    // Add borders
    this.addBorders(worksheet, 2, inventoryData.items.length + 2);
    this.addBorders(worksheet, inventoryData.items.length + 4, worksheet.rowCount);
  }

  private async createCustomerAnalysisSheet(workbook: ExcelJS.Workbook, date: Date) {
    const worksheet = workbook.addWorksheet('Customer Analysis');
    
    // Set column widths
    worksheet.columns = [
      { key: 'customer', width: 30 },
      { key: 'totalSales', width: 20 },
      { key: 'orders', width: 15 },
      { key: 'avgOrder', width: 20 },
      { key: 'balance', width: 20 },
      { key: 'status', width: 15 }
    ];

    // Add title
    const titleRow = worksheet.addRow(['']);
    titleRow.height = 30;
    const titleCell = titleRow.getCell(1);
    titleCell.value = 'Customer Performance & Debt Analysis';
    titleCell.font = { size: 18, bold: true, color: { argb: 'FF0891B2' } };
    titleCell.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A1:F1');

    // Add headers
    const headers = ['Customer Name', 'Total Sales (KSH)', 'Orders', 'Avg Order (KSH)', 'Balance (KSH)', 'Status'];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0891B2' }
    };
    headerRow.alignment = { horizontal: 'center' };

    // Get customer data
    const customerData = await this.getCustomerData(date);
    
    // Add customer rows
    customerData.customers.forEach(customer => {
      const status = customer.balance < 0 ? 'Outstanding' : 'Good Standing';
      const row = worksheet.addRow([
        customer.name,
        customer.totalSales,
        customer.orders,
        customer.averageOrder,
        customer.balance,
        status
      ]);

      // Style based on balance
      if (customer.balance < 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
      }

      // Format numbers
      row.getCell(2).numFmt = '#,##0.00';
      row.getCell(4).numFmt = '#,##0.00';
      row.getCell(5).numFmt = '#,##0.00';
    });

    // Add debt summary
    worksheet.addRow(['']);
    worksheet.addRow(['Debt Summary', '', '', '', '', '']);
    const debtHeaderRow = worksheet.getRow(customerData.customers.length + 3);
    debtHeaderRow.font = { size: 14, bold: true, color: { argb: 'FF1E293B' } };
    debtHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFEF2F2' }
    };

    worksheet.addRow(['Total Outstanding', customerData.debtSummary.totalOutstanding, '', '', '', '']);
    worksheet.addRow(['Customers in Debt', customerData.debtSummary.customerCount, '', '', '', '']);
    worksheet.addRow(['Average Debt', customerData.debtSummary.averageDebt, '', '', '', '']);

    // Style debt summary rows
    for (let i = customerData.customers.length + 4; i <= customerData.customers.length + 6; i++) {
      const row = worksheet.getRow(i);
      row.getCell(1).font = { bold: true };
      row.getCell(2).numFmt = '#,##0.00';
    }

    // Add borders
    this.addBorders(worksheet, 2, customerData.customers.length + 2);
    this.addBorders(worksheet, customerData.customers.length + 4, worksheet.rowCount);
  }

  private async createExpensesSheet(workbook: ExcelJS.Workbook, date: Date) {
    const worksheet = workbook.addWorksheet('Expenses Analysis');
    
    // Set column widths
    worksheet.columns = [
      { key: 'category', width: 25 },
      { key: 'amount', width: 20 },
      { key: 'percentage', width: 15 },
      { key: 'count', width: 15 },
      { key: 'avgAmount', width: 20 }
    ];

    // Add title
    const titleRow = worksheet.addRow(['']);
    titleRow.height = 30;
    const titleCell = titleRow.getCell(1);
    titleCell.value = 'Expenses Breakdown & Analysis';
    titleCell.font = { size: 18, bold: true, color: { argb: 'FF64748B' } };
    titleCell.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A1:E1');

    // Add headers
    const headers = ['Category', 'Total Amount (KSH)', 'Percentage', 'Transactions', 'Avg Amount (KSH)'];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF64748B' }
    };
    headerRow.alignment = { horizontal: 'center' };

    // Get expenses data
    const expensesData = await this.getExpensesData(date);
    
    // Add expense rows
    expensesData.categories.forEach(category => {
      const row = worksheet.addRow([
        category.name,
        category.amount,
        category.percentage,
        category.count,
        category.averageAmount
      ]);

      // Format numbers
      row.getCell(2).numFmt = '#,##0.00';
      row.getCell(3).numFmt = '0.0%';
      row.getCell(5).numFmt = '#,##0.00';
    });

    // Add summary
    worksheet.addRow(['']);
    worksheet.addRow(['Expenses Summary', '', '', '', '']);
    const summaryHeaderRow = worksheet.getRow(expensesData.categories.length + 3);
    summaryHeaderRow.font = { size: 14, bold: true, color: { argb: 'FF1E293B' } };
    summaryHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }
    };

    worksheet.addRow(['Total Expenses', expensesData.summary.totalAmount, '', '', '']);
    worksheet.addRow(['Total Transactions', '', '', expensesData.summary.count, '']);
    worksheet.addRow(['Average Transaction', '', '', '', expensesData.summary.averageAmount]);

    // Style summary rows
    for (let i = expensesData.categories.length + 4; i <= expensesData.categories.length + 6; i++) {
      const row = worksheet.getRow(i);
      row.getCell(1).font = { bold: true };
      if (i === expensesData.categories.length + 4) {
        row.getCell(2).numFmt = '#,##0.00';
      } else if (i === expensesData.categories.length + 6) {
        row.getCell(5).numFmt = '#,##0.00';
      }
    }

    // Add borders
    this.addBorders(worksheet, 2, expensesData.categories.length + 2);
    this.addBorders(worksheet, expensesData.categories.length + 4, worksheet.rowCount);
  }

  private addBorders(worksheet: ExcelJS.Worksheet, startRow: number, endRow: number) {
    for (let i = startRow; i <= endRow; i++) {
      const row = worksheet.getRow(i);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
  }

  private getStockStatus(quantity: number, minStock: number): string {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= minStock) return 'Low Stock';
    return 'Good Stock';
  }

  // Data fetching methods
  private async getKPIData(date: Date) {
    const startDate = format(subDays(date, 1), 'yyyy-MM-dd');
    const endDate = format(date, 'yyyy-MM-dd');
    
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

    const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalPaid = sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
    const outstandingAmount = totalSales - totalPaid;
    const transactions = sales.length;
    
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
    const averageOrderValue = transactions > 0 ? totalSales / transactions : 0;

    return {
      totalSales,
      totalPaid,
      outstandingAmount,
      transactions,
      netProfit,
      profitMargin,
      collectionRate,
      averageOrderValue,
      totalRevenue: totalSales,
      totalCost,
      grossProfit: totalSales - totalCost,
      expenses: 0 // Will be calculated separately
    };
  }

  private async getSalesData(date: Date) {
    const startDate = format(subDays(date, 1), 'yyyy-MM-dd');
    const endDate = format(date, 'yyyy-MM-dd');
    
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

    // Top items
    const itemSales: Record<string, { 
      quantity: number; 
      revenue: number; 
      profit: number; 
      cost: number;
      category: string;
      profitMargin: number;
    }> = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!itemSales[item.item.name]) {
          itemSales[item.item.name] = { 
            quantity: 0, 
            revenue: 0, 
            profit: 0, 
            cost: 0,
            category: item.item.category || 'General',
            profitMargin: 0
          };
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
        category: data.category,
        quantity: data.quantity,
        revenue: data.revenue,
        profit: data.profit,
        profitMargin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    // Recent sales
    const recentSales = sales
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
      .map(sale => ({
        id: sale.id,
        customer: sale.customer?.name || 'Unknown Customer',
        amount: sale.totalAmount,
        paid: sale.paidAmount,
        paymentType: sale.paymentType,
        date: sale.createdAt
      }));

    return { topItems, recentSales };
  }

  private async getFinancialData(date: Date) {
    const startDate = format(subDays(date, 1), 'yyyy-MM-dd');
    const endDate = format(date, 'yyyy-MM-dd');
    
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalPaid = sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    
    // Estimate cost of goods (70% of revenue as default)
    const totalCost = totalRevenue * 0.7;
    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalExpenses;
    
    const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      expenses: totalExpenses,
      netProfit,
      cashInflow: totalPaid,
      cashOutflow: totalExpenses,
      netCashFlow: totalPaid - totalExpenses,
      collectionRate
    };
  }

  private async getInventoryData() {
    const inventory = await prisma.inventoryItem.findMany();
    
    const items = inventory.map(item => ({
      name: item.name,
      category: item.category || 'General',
      quantity: item.quantity,
      unit: item.unit || 'units',
      lowStockLimit: item.lowStockLimit || 10,
      stockValue: (item.sellPrice || item.basePrice || 0) * item.quantity
    }));

    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + item.stockValue, 0);
    const lowStockItems = items.filter(item => item.quantity <= item.lowStockLimit).length;
    const outOfStock = items.filter(item => item.quantity === 0).length;

    return {
      items,
      summary: {
        totalItems,
        totalValue,
        lowStockItems,
        outOfStock
      }
    };
  }

  private async getCustomerData(date: Date) {
    const startDate = format(subDays(date, 1), 'yyyy-MM-dd');
    const endDate = format(date, 'yyyy-MM-dd');
    
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
        transactions: true
      },
    });

    const customersWithData = customers.map(customer => {
      const totalSales = customer.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const orders = customer.sales.length;
      const averageOrder = orders > 0 ? totalSales / orders : 0;
      const balance = customer.transactions.reduce((sum, tx) => sum + tx.amount, 0);

      return {
        name: customer.name,
        totalSales,
        orders,
        averageOrder,
        balance
      };
    }).filter(c => c.totalSales > 0);

    // Get debt summary
    const debtData = customers.filter(c => {
      const balance = c.transactions.reduce((sum, tx) => sum + tx.amount, 0);
      return balance < 0;
    });

    const totalOutstanding = debtData.reduce((sum, c) => {
      const balance = c.transactions.reduce((sum, tx) => sum + tx.amount, 0);
      return sum + Math.abs(balance);
    }, 0);

    const customerCount = debtData.length;
    const averageDebt = customerCount > 0 ? totalOutstanding / customerCount : 0;

    return {
      customers: customersWithData.sort((a, b) => b.totalSales - a.totalSales),
      debtSummary: {
        totalOutstanding,
        customerCount,
        averageDebt
      }
    };
  }

  private async getExpensesData(date: Date) {
    const startDate = format(subDays(date, 1), 'yyyy-MM-dd');
    const endDate = format(date, 'yyyy-MM-dd');
    
    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const byCategory: Record<string, { amount: number; count: number }> = {};
    
    expenses.forEach(e => {
      const cat = e.category || 'General';
      if (!byCategory[cat]) {
        byCategory[cat] = { amount: 0, count: 0 };
      }
      byCategory[cat].amount += (e.amount || 0);
      byCategory[cat].count += 1;
    });

    const categories = Object.entries(byCategory)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
        count: data.count,
        averageAmount: data.count > 0 ? data.amount / data.count : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      categories,
      summary: {
        totalAmount,
        count: expenses.length,
        averageAmount: expenses.length > 0 ? totalAmount / expenses.length : 0
      }
    };
  }

  private async generateHTMLContent(date: Date): Promise<string> {
    // Get all the data needed for the comprehensive HTML report
    const startDate = format(subDays(date, 1), 'yyyy-MM-dd');
    const endDate = format(date, 'yyyy-MM-dd');
    
    const kpiData = await this.getKPIData(date);
    const salesData = await this.getSalesData(date);
    const financialData = await this.getFinancialData(date);
    const inventoryData = await this.getInventoryData();
    const customerData = await this.getCustomerData(date);
    const expensesData = await this.getExpensesData(date);
    
    const reportData = {
      kpi: kpiData,
      topItems: salesData.topItems,
      recentSales: salesData.recentSales,
      financial: financialData,
      inventory: inventoryData,
      customers: customerData,
      expenses: expensesData
    };
    
    return HTMLTemplates.generateDailyReportHTML(date, reportData);
  }
}
