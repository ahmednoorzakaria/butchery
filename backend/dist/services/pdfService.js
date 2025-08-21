"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFService = void 0;
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const pdfkit_1 = __importDefault(require("pdfkit"));
const prisma = new client_1.PrismaClient();
class PDFService {
    async generateDailyReport(date = new Date()) {
        try {
            // Create a new PDF document
            const doc = new pdfkit_1.default({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Daily Business Report - ${(0, date_fns_1.format)(date, 'MMM dd, yyyy')}`,
                    Author: 'Butchery Management System',
                    Subject: 'Daily Business Report',
                    Keywords: 'business, report, daily, butchery',
                    CreationDate: new Date(),
                }
            });
            // Collect the PDF data chunks
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            // When the PDF is finished, resolve with the buffer
            const pdfPromise = new Promise((resolve) => {
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
        }
        catch (error) {
            console.error('Error generating PDF report:', error);
            // Fallback: generate a simple text-based PDF
            return await this.generateFallbackPDF(date);
        }
    }
    async generatePDFContent(doc, date) {
        const startDate = (0, date_fns_1.format)((0, date_fns_1.subDays)(date, 1), 'yyyy-MM-dd');
        const endDate = (0, date_fns_1.format)(date, 'yyyy-MM-dd');
        // Fetch all report data
        const salesData = await this.getSalesData(startDate, endDate);
        const profitLossData = await this.getProfitLossData(startDate, endDate);
        const inventoryData = await this.getInventoryData();
        const cashFlowData = await this.getCashFlowData(startDate, endDate);
        const customerData = await this.getCustomerData(startDate, endDate);
        // Header
        doc.fontSize(24)
            .font('Helvetica-Bold')
            .text('Daily Business Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(16)
            .font('Helvetica')
            .text((0, date_fns_1.format)(date, 'EEEE, MMMM dd, yyyy'), { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10)
            .font('Helvetica-Oblique')
            .text(`Generated on ${(0, date_fns_1.format)(new Date(), 'MMM dd, yyyy HH:mm:ss')}`, { align: 'center' });
        doc.moveDown(2);
        // Sales Summary Section
        doc.fontSize(16)
            .font('Helvetica-Bold')
            .text('📊 Sales Summary');
        doc.moveDown(0.5);
        // Sales metrics in a grid format
        const salesMetrics = [
            ['Total Sales', `KSH ${salesData.summary?.totalSales?.toLocaleString() || '0'}`],
            ['Total Collected', `KSH ${salesData.summary?.totalPaid?.toLocaleString() || '0'}`],
            ['Outstanding', `KSH ${salesData.summary?.outstandingAmount?.toLocaleString() || '0'}`],
            ['Transactions', `${salesData.summary?.numberOfSales || '0'}`],
            ['Net Profit', `KSH ${salesData.summary?.netProfit?.toLocaleString() || '0'}`],
            ['Profit Margin', `${salesData.summary?.profitMargin?.toFixed(1) || '0'}%`],
            ['Collection Rate', `${salesData.summary?.collectionRate?.toFixed(1) || '0'}%`],
            ['Avg Order Value', `KSH ${salesData.summary?.averageOrderValue?.toLocaleString() || '0'}`]
        ];
        this.drawMetricsGrid(doc, salesMetrics, 2);
        doc.moveDown(1);
        // Top Selling Items
        if (salesData.topItems && salesData.topItems.length > 0) {
            doc.fontSize(16)
                .font('Helvetica-Bold')
                .text('🏆 Top Selling Items');
            doc.moveDown(0.5);
            const topItemsData = salesData.topItems.slice(0, 10).map((item, index) => [
                `${index + 1}`,
                item.name || 'Unknown Item',
                item.quantity?.toFixed(2) || '0',
                `KSH ${item.revenue?.toLocaleString() || '0'}`,
                `KSH ${item.profit?.toLocaleString() || '0'}`
            ]);
            const topItemsHeaders = ['Rank', 'Item', 'Quantity', 'Revenue', 'Profit'];
            this.drawDataTable(doc, [topItemsHeaders, ...topItemsData]);
            doc.moveDown(1);
        }
        else {
            doc.fontSize(14)
                .font('Helvetica')
                .fill('#6c757d')
                .text('No sales data available for this period.', { align: 'center' });
            doc.moveDown(1);
        }
        // Recent Sales
        if (salesData.recentSales && salesData.recentSales.length > 0) {
            doc.fontSize(16)
                .font('Helvetica-Bold')
                .text('🛒 Recent Sales');
            doc.moveDown(0.5);
            const recentSalesData = salesData.recentSales.slice(0, 10).map(sale => [
                `#${sale.id}`,
                sale.customer || 'Unknown Customer',
                `KSH ${sale.amount?.toLocaleString() || '0'}`,
                `KSH ${sale.paid?.toLocaleString() || '0'}`,
                sale.paymentType || 'Unknown',
                (0, date_fns_1.format)(new Date(sale.date), 'MMM dd, HH:mm')
            ]);
            const recentSalesHeaders = ['ID', 'Customer', 'Amount', 'Paid', 'Payment', 'Date'];
            this.drawDataTable(doc, [recentSalesHeaders, ...recentSalesData]);
            doc.moveDown(1);
        }
        else {
            doc.fontSize(14)
                .font('Helvetica')
                .fill('#6c757d')
                .text('No recent sales data available for this period.', { align: 'center' });
            doc.moveDown(1);
        }
        // Add page break for next section
        doc.addPage();
        // Profit & Loss Section
        doc.fontSize(16)
            .font('Helvetica-Bold')
            .text('💰 Profit & Loss Analysis');
        doc.moveDown(0.5);
        const profitLossMetrics = [
            ['Total Revenue', `KSH ${profitLossData.summary?.totalRevenue?.toLocaleString() || '0'}`],
            ['Total Cost', `KSH ${profitLossData.summary?.totalCost?.toLocaleString() || '0'}`],
            ['Total Profit', `KSH ${profitLossData.summary?.totalProfit?.toLocaleString() || '0'}`],
            ['Profit Margin', `${profitLossData.summary?.profitMargin?.toFixed(1) || '0'}%`]
        ];
        this.drawMetricsGrid(doc, profitLossMetrics, 2);
        doc.moveDown(1);
        // Top Performers
        if (profitLossData.topPerformers && profitLossData.topPerformers.length > 0) {
            doc.fontSize(16)
                .font('Helvetica-Bold')
                .text('⭐ Top Performing Items');
            doc.moveDown(0.5);
            const topPerformersData = profitLossData.topPerformers.slice(0, 10).map((item, index) => [
                `${index + 1}`,
                item.name || 'Unknown Item',
                item.category || 'General',
                item.totalQuantity?.toFixed(2) || '0',
                `KSH ${item.totalRevenue?.toLocaleString() || '0'}`,
                `KSH ${item.totalProfit?.toLocaleString() || '0'}`,
                `${item.profitMargin?.toFixed(1) || '0'}%`
            ]);
            const topPerformersHeaders = ['Rank', 'Item', 'Category', 'Quantity', 'Revenue', 'Profit', 'Margin'];
            this.drawDataTable(doc, [topPerformersHeaders, ...topPerformersData]);
            doc.moveDown(1);
        }
        else {
            doc.fontSize(14)
                .font('Helvetica')
                .fill('#6c757d')
                .text('No profit/loss data available for this period.', { align: 'center' });
            doc.moveDown(1);
        }
        // Add page break for next section
        doc.addPage();
        // Inventory Status
        doc.fontSize(16)
            .font('Helvetica-Bold')
            .text('📦 Inventory Status');
        doc.moveDown(0.5);
        const inventoryMetrics = [
            ['Total Items', `${inventoryData.summary?.totalItems || '0'}`],
            ['Total Value', `KSH ${inventoryData.summary?.totalValue?.toLocaleString() || '0'}`],
            ['Potential Profit', `KSH ${inventoryData.summary?.potentialProfit?.toLocaleString() || '0'}`],
            ['Categories', `${inventoryData.summary?.categoryCount || '0'}`]
        ];
        this.drawMetricsGrid(doc, inventoryMetrics, 2);
        doc.moveDown(1);
        // Cash Flow
        doc.fontSize(16)
            .font('Helvetica-Bold')
            .text('💳 Cash Flow Summary');
        doc.moveDown(0.5);
        const cashFlowMetrics = [
            ['Total Revenue', `KSH ${cashFlowData.summary?.totalRevenue?.toLocaleString() || '0'}`],
            ['Total Collected', `KSH ${cashFlowData.summary?.totalCollected?.toLocaleString() || '0'}`],
            ['Total Outstanding', `KSH ${cashFlowData.summary?.totalOutstanding?.toLocaleString() || '0'}`],
            ['Collection Rate', `${cashFlowData.summary?.collectionRate?.toFixed(1) || '0'}%`]
        ];
        this.drawMetricsGrid(doc, cashFlowMetrics, 2);
        doc.moveDown(1);
        // Customer Analysis
        doc.fontSize(16)
            .font('Helvetica-Bold')
            .text('👥 Customer Analysis');
        doc.moveDown(0.5);
        const customerMetrics = [
            ['Total Customers', `${customerData.totalCustomers || '0'}`],
            ['Active Customers', `${customerData.activeCustomers || '0'}`],
            ['Total Spent', `KSH ${customerData.customers?.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString() || '0'}`],
            ['Customers in Period', `${customerData.customers?.length || '0'}`]
        ];
        this.drawMetricsGrid(doc, customerMetrics, 2);
        doc.moveDown(1);
        // Debt Summary
        doc.fontSize(16)
            .font('Helvetica-Bold')
            .text('⚠️ Debt Summary');
        doc.moveDown(0.5);
        const debtSummary = await this.getDebtSummaryData();
        if (debtSummary) {
            const debtMetrics = [
                ['Total Outstanding', `KSH ${debtSummary.totalOutstanding.toLocaleString()}`],
                ['Customers with Debt', `${debtSummary.customerCount}`],
                ['Average Debt', `KSH ${debtSummary.averageDebt.toFixed(0)}`]
            ];
            this.drawMetricsGrid(doc, debtMetrics, 2);
            doc.moveDown(1);
            // Top debtors table
            if (debtSummary.topDebtors.length > 0) {
                doc.fontSize(14)
                    .font('Helvetica-Bold')
                    .text('Top Debtors:');
                doc.moveDown(0.5);
                const debtorsData = debtSummary.topDebtors.slice(0, 10).map((debtor, index) => [
                    `${index + 1}`,
                    debtor.name,
                    `KSH ${Math.abs(debtor.balance).toLocaleString()}`
                ]);
                const debtorsHeaders = ['Rank', 'Customer Name', 'Outstanding Balance'];
                this.drawDataTable(doc, [debtorsHeaders, ...debtorsData]);
            }
        }
        // Footer
        doc.moveDown(2);
        doc.fontSize(10)
            .font('Helvetica-Oblique')
            .text('This report was automatically generated by the Butchery Management System.', { align: 'center' });
        doc.moveDown(0.5);
        doc.text('For questions or support, please contact your system administrator.', { align: 'center' });
    }
    // Draw metrics in a grid format (2 columns)
    drawMetricsGrid(doc, data, columns) {
        const pageWidth = doc.page.width - 100; // 50px margin on each side
        const colWidth = pageWidth / columns;
        const rowHeight = 30;
        const startX = doc.x;
        const startY = doc.y;
        data.forEach((row, rowIndex) => {
            const y = startY + (rowIndex * rowHeight);
            // Draw background rectangle for each metric
            doc.rect(startX, y, colWidth, rowHeight)
                .fill('#f8f9fa');
            // Draw border
            doc.rect(startX, y, colWidth, rowHeight)
                .stroke();
            // Add label
            doc.fontSize(10)
                .font('Helvetica-Bold')
                .fill('#495057')
                .text(row[0], startX + 10, y + 5, {
                width: colWidth - 20,
                align: 'left'
            });
            // Add value
            doc.fontSize(12)
                .font('Helvetica-Bold')
                .fill('#007bff')
                .text(row[1], startX + 10, y + 15, {
                width: colWidth - 20,
                align: 'left'
            });
        });
        // Update document position
        doc.y = startY + (data.length * rowHeight) + 10;
    }
    // Draw data tables with proper formatting
    drawDataTable(doc, data) {
        if (data.length === 0)
            return;
        const pageWidth = doc.page.width - 100; // 50px margin on each side
        const colCount = data[0].length;
        const colWidth = pageWidth / colCount;
        const rowHeight = 25;
        const startX = doc.x;
        const startY = doc.y;
        // Draw header row
        const headerY = startY;
        doc.rect(startX, headerY, pageWidth, rowHeight)
            .fill('#e9ecef');
        doc.rect(startX, headerY, pageWidth, rowHeight)
            .stroke();
        // Add header text
        data[0].forEach((header, colIndex) => {
            const x = startX + (colIndex * colWidth);
            doc.fontSize(10)
                .font('Helvetica-Bold')
                .fill('#495057')
                .text(header, x + 5, headerY + 5, {
                width: colWidth - 10,
                align: 'left'
            });
        });
        // Draw data rows
        for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
            const row = data[rowIndex];
            const y = startY + (rowIndex * rowHeight);
            // Alternate row colors
            if (rowIndex % 2 === 0) {
                doc.rect(startX, y, pageWidth, rowHeight)
                    .fill('#f8f9fa');
            }
            // Draw row border
            doc.rect(startX, y, pageWidth, rowHeight)
                .stroke();
            // Add row data
            row.forEach((cell, colIndex) => {
                const x = startX + (colIndex * colWidth);
                doc.fontSize(9)
                    .font('Helvetica')
                    .fill('#212529')
                    .text(cell, x + 5, y + 5, {
                    width: colWidth - 10,
                    align: 'left'
                });
            });
        }
        // Update document position
        doc.y = startY + (data.length * rowHeight) + 10;
    }
    async getDebtSummaryData() {
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
        }
        catch (error) {
            console.error('Error fetching debt summary data:', error);
            return null;
        }
    }
    async getSalesData(startDate, endDate) {
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
                    const itemCost = item.item.basePrice || item.price * 0.7;
                    totalCost += item.quantity * itemCost;
                });
            });
            const netProfit = totalSales - totalCost;
            const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
            const collectionRate = totalSales > 0 ? (totalPaid / totalSales) * 100 : 0;
            const averageOrderValue = numberOfSales > 0 ? totalSales / numberOfSales : 0;
            // Top items
            const itemSales = {};
            sales.forEach(sale => {
                sale.items.forEach(item => {
                    if (!itemSales[item.item.name]) {
                        itemSales[item.item.name] = { quantity: 0, revenue: 0, profit: 0, cost: 0 };
                    }
                    const itemCost = item.item.basePrice || item.price * 0.7;
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
                cost: data.cost,
                profit: data.profit,
            }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 10);
            // Recent sales
            const recentSales = sales
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 10)
                .map(sale => ({
                id: sale.id,
                customer: sale.customer.name,
                amount: sale.totalAmount,
                paid: sale.paidAmount,
                paymentType: sale.paymentType,
                date: sale.createdAt,
                items: sale.items.map(item => ({
                    quantity: item.quantity,
                    name: item.item.name,
                    price: item.price,
                })),
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
                    averageOrderValue,
                },
                topItems,
                recentSales,
            };
        }
        catch (error) {
            console.error('Error fetching sales data:', error);
            return { summary: {}, topItems: [], recentSales: [] };
        }
    }
    async getProfitLossData(startDate, endDate) {
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
            const itemProfitability = {};
            sales.forEach(sale => {
                sale.items.forEach(item => {
                    const revenue = item.quantity * item.price;
                    const cost = item.quantity * (item.item.basePrice || item.price * 0.7);
                    const profit = revenue - cost;
                    totalRevenue += revenue;
                    totalCost += cost;
                    if (!itemProfitability[item.item.name]) {
                        itemProfitability[item.item.name] = {
                            name: item.item.name,
                            category: item.item.category || 'General',
                            totalQuantity: 0,
                            totalRevenue: 0,
                            totalCost: 0,
                            totalProfit: 0,
                        };
                    }
                    itemProfitability[item.item.name].totalQuantity += item.quantity;
                    itemProfitability[item.item.name].totalRevenue += revenue;
                    itemProfitability[item.item.name].totalCost += cost;
                    itemProfitability[item.item.name].totalProfit += profit;
                });
            });
            Object.values(itemProfitability).forEach((item) => {
                item.profitMargin = item.totalRevenue > 0 ? (item.totalProfit / item.totalRevenue) * 100 : 0;
            });
            const totalProfit = totalRevenue - totalCost;
            const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
            return {
                summary: {
                    totalRevenue,
                    totalCost,
                    totalProfit,
                    profitMargin,
                },
                topPerformers: Object.values(itemProfitability)
                    .sort((a, b) => b.totalProfit - a.totalProfit)
                    .slice(0, 15),
            };
        }
        catch (error) {
            console.error('Error fetching profit loss data:', error);
            return { summary: {}, topPerformers: [] };
        }
    }
    async getInventoryData() {
        try {
            const inventory = await prisma.inventoryItem.findMany();
            const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
            const totalValue = inventory.reduce((sum, item) => {
                return sum + (item.quantity * (item.sellPrice || 0));
            }, 0);
            const potentialProfit = inventory.reduce((sum, item) => {
                return sum + (item.quantity * ((item.sellPrice || 0) - (item.basePrice || 0)));
            }, 0);
            const categoryCount = new Set(inventory.map(item => item.category)).size;
            return {
                summary: {
                    totalItems,
                    totalValue,
                    potentialProfit,
                    categoryCount,
                },
            };
        }
        catch (error) {
            console.error('Error fetching inventory data:', error);
            return { summary: {} };
        }
    }
    async getCashFlowData(startDate, endDate) {
        try {
            const sales = await prisma.sale.findMany({
                where: {
                    createdAt: {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                    },
                },
            });
            const totalCollected = sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
            const totalOutstanding = sales.reduce((sum, sale) => sum + (sale.totalAmount - sale.paidAmount), 0);
            const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0;
            return {
                summary: {
                    totalRevenue,
                    totalCollected,
                    totalOutstanding,
                    collectionRate,
                },
            };
        }
        catch (error) {
            console.error('Error fetching cash flow data:', error);
            return { summary: {} };
        }
    }
    async getCustomerData(startDate, endDate) {
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
            const topCustomers = customers
                .map(customer => {
                const total = customer.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
                const orders = customer.sales.length;
                return {
                    name: customer.name,
                    orders,
                    total,
                    average: orders > 0 ? total / orders : 0,
                };
            })
                .filter(customer => customer.total > 0)
                .sort((a, b) => b.total - a.total)
                .slice(0, 15);
            return {
                customers: topCustomers.map(customer => ({
                    name: customer.name,
                    numberOfOrders: customer.orders,
                    totalSpent: customer.total,
                    averageOrderValue: customer.average,
                })),
                totalCustomers: customers.length,
                activeCustomers: customers.filter(c => c.sales.length > 0).length,
            };
        }
        catch (error) {
            console.error('Error fetching customer data:', error);
            return { customers: [], totalCustomers: 0, activeCustomers: 0 };
        }
    }
    async generateFallbackPDF(date) {
        const reportDate = (0, date_fns_1.format)(date, 'EEEE, MMMM dd, yyyy');
        const currentTime = (0, date_fns_1.format)(new Date(), 'MMM dd, yyyy HH:mm:ss');
        const doc = new pdfkit_1.default({
            size: 'A4',
            margin: 50,
            info: {
                Title: `Daily Business Report - ${(0, date_fns_1.format)(date, 'MMM dd, yyyy')}`,
                Author: 'Butchery Management System',
                Subject: 'Daily Business Report',
                Keywords: 'business, report, daily, butchery',
                CreationDate: new Date(),
            }
        });
        // Collect the PDF data chunks
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        // When the PDF is finished, resolve with the buffer
        const pdfPromise = new Promise((resolve) => {
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
exports.PDFService = PDFService;
