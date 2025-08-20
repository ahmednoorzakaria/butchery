"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFService = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const prisma = new client_1.PrismaClient();
class PDFService {
    constructor() {
        this.browser = null;
    }
    async initialize() {
        try {
            this.browser = await puppeteer_1.default.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process'
                ]
            });
        }
        catch (error) {
            console.error('Failed to initialize Puppeteer browser:', error);
            throw new Error('PDF generation service unavailable');
        }
    }
    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
    async generateHTMLReport(date) {
        const startDate = (0, date_fns_1.format)((0, date_fns_1.subDays)(date, 1), 'yyyy-MM-dd');
        const endDate = (0, date_fns_1.format)(date, 'yyyy-MM-dd');
        // Fetch all report data
        const salesData = await this.getSalesData(startDate, endDate);
        const profitLossData = await this.getProfitLossData(startDate, endDate);
        const inventoryData = await this.getInventoryData();
        const cashFlowData = await this.getCashFlowData(startDate, endDate);
        const customerData = await this.getCustomerData(startDate, endDate);
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Daily Business Report - ${(0, date_fns_1.format)(date, 'MMM dd, yyyy')}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section-title {
            background-color: #f0f0f0;
            padding: 10px;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 20px;
          }
          .metric-card {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
            border: 1px solid #dee2e6;
          }
          .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
          }
          .metric-label {
            font-size: 12px;
            color: #6c757d;
            margin-top: 5px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .table th, .table td {
            border: 1px solid #dee2e6;
            padding: 8px;
            text-align: left;
          }
          .table th {
            background-color: #f8f9fa;
            font-weight: bold;
          }
          .positive { color: #28a745; }
          .negative { color: #dc3545; }
          .warning { color: #ffc107; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Daily Business Report</h1>
          <h2>${(0, date_fns_1.format)(date, 'EEEE, MMMM dd, yyyy')}</h2>
          <p>Generated on ${(0, date_fns_1.format)(new Date(), 'MMM dd, yyyy HH:mm:ss')}</p>
        </div>

        <!-- Sales Summary -->
        <div class="section">
          <div class="section-title">📊 Sales Summary</div>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">KSH ${salesData.summary?.totalSales?.toLocaleString() || '0'}</div>
              <div class="metric-label">Total Sales</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">KSH ${salesData.summary?.totalPaid?.toLocaleString() || '0'}</div>
              <div class="metric-label">Total Collected</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">KSH ${salesData.summary?.outstandingAmount?.toLocaleString() || '0'}</div>
              <div class="metric-label">Outstanding</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${salesData.summary?.numberOfSales || '0'}</div>
              <div class="metric-label">Transactions</div>
            </div>
          </div>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value positive">KSH ${salesData.summary?.netProfit?.toLocaleString() || '0'}</div>
              <div class="metric-label">Net Profit</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${salesData.summary?.profitMargin?.toFixed(1) || '0'}%</div>
              <div class="metric-label">Profit Margin</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${salesData.summary?.collectionRate?.toFixed(1) || '0'}%</div>
              <div class="metric-label">Collection Rate</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">KSH ${salesData.summary?.averageOrderValue?.toLocaleString() || '0'}</div>
              <div class="metric-label">Avg Order Value</div>
            </div>
          </div>
        </div>

        <!-- Top Selling Items -->
        <div class="section">
          <div class="section-title">🏆 Top Selling Items</div>
          <table class="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Item</th>
                <th>Quantity</th>
                <th>Revenue</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              ${salesData.topItems?.slice(0, 10).map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.name}</td>
                  <td>${item.quantity?.toFixed(2)}</td>
                  <td>KSH ${item.revenue?.toLocaleString()}</td>
                  <td class="positive">KSH ${item.profit?.toLocaleString()}</td>
                </tr>
              `).join('') || '<tr><td colspan="5">No data available</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- Recent Sales -->
        <div class="section">
          <div class="section-title">🛒 Recent Sales</div>
          <table class="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Payment Type</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${salesData.recentSales?.slice(0, 10).map(sale => `
                <tr>
                  <td>#${sale.id}</td>
                  <td>${sale.customer}</td>
                  <td>KSH ${sale.amount?.toLocaleString()}</td>
                  <td>KSH ${sale.paid?.toLocaleString()}</td>
                  <td>${sale.paymentType}</td>
                  <td>${(0, date_fns_1.format)(new Date(sale.date), 'MMM dd, HH:mm')}</td>
                </tr>
              `).join('') || '<tr><td colspan="6">No data available</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="page-break"></div>

        <!-- Profit & Loss -->
        <div class="section">
          <div class="section-title">💰 Profit & Loss Analysis</div>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">KSH ${profitLossData.summary?.totalRevenue?.toLocaleString() || '0'}</div>
              <div class="metric-label">Total Revenue</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">KSH ${profitLossData.summary?.totalCost?.toLocaleString() || '0'}</div>
              <div class="metric-label">Total Cost</div>
            </div>
            <div class="metric-card">
              <div class="metric-value positive">KSH ${profitLossData.summary?.totalProfit?.toLocaleString() || '0'}</div>
              <div class="metric-label">Total Profit</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${profitLossData.summary?.profitMargin?.toFixed(1) || '0'}%</div>
              <div class="metric-label">Profit Margin</div>
            </div>
          </div>
        </div>

        <!-- Top Performers -->
        <div class="section">
          <div class="section-title">⭐ Top Performing Items</div>
          <table class="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Item</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Revenue</th>
                <th>Profit</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              ${profitLossData.topPerformers?.slice(0, 10).map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.name}</td>
                  <td>${item.category}</td>
                  <td>${item.totalQuantity?.toFixed(2)}</td>
                  <td>KSH ${item.totalRevenue?.toLocaleString()}</td>
                  <td class="positive">KSH ${item.totalProfit?.toLocaleString()}</td>
                  <td>${item.profitMargin?.toFixed(1)}%</td>
                </tr>
              `).join('') || '<tr><td colspan="7">No data available</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="page-break"></div>

        <!-- Inventory Status -->
        <div class="section">
          <div class="section-title">📦 Inventory Status</div>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">${inventoryData.summary?.totalItems || '0'}</div>
              <div class="metric-label">Total Items</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">KSH ${inventoryData.summary?.totalValue?.toLocaleString() || '0'}</div>
              <div class="metric-label">Total Value</div>
            </div>
            <div class="metric-card">
              <div class="metric-value positive">KSH ${inventoryData.summary?.potentialProfit?.toLocaleString() || '0'}</div>
              <div class="metric-label">Potential Profit</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${inventoryData.summary?.categoryCount || '0'}</div>
              <div class="metric-label">Categories</div>
            </div>
          </div>
        </div>

        <!-- Cash Flow -->
        <div class="section">
          <div class="section-title">💳 Cash Flow Summary</div>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">KSH ${cashFlowData.summary?.totalRevenue?.toLocaleString() || '0'}</div>
              <div class="metric-label">Total Revenue</div>
            </div>
            <div class="metric-card">
              <div class="metric-value positive">KSH ${cashFlowData.summary?.totalCollected?.toLocaleString() || '0'}</div>
              <div class="metric-label">Total Collected</div>
            </div>
            <div class="metric-card">
              <div class="metric-value negative">KSH ${cashFlowData.summary?.totalOutstanding?.toLocaleString() || '0'}</div>
              <div class="metric-label">Total Outstanding</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${cashFlowData.summary?.collectionRate?.toFixed(1) || '0'}%</div>
              <div class="metric-label">Collection Rate</div>
            </div>
          </div>
        </div>

        <!-- Customer Analysis -->
        <div class="section">
          <div class="section-title">👥 Customer Analysis</div>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">${customerData.totalCustomers || '0'}</div>
              <div class="metric-label">Total Customers</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${customerData.activeCustomers || '0'}</div>
              <div class="metric-label">Active Customers</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">KSH ${customerData.customers?.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString() || '0'}</div>
              <div class="metric-label">Total Spent</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${customerData.customers?.length || '0'}</div>
              <div class="metric-label">Customers in Period</div>
            </div>
          </div>
        </div>

        <!-- Debt Summary -->
        <div class="section">
          <div class="section-title">⚠️ Debt Summary</div>
          ${await this.getDebtSummaryHTML()}
        </div>

        <!-- Footer -->
        <div class="section" style="margin-top: 50px; text-align: center; border-top: 1px solid #dee2e6; padding-top: 20px;">
          <p style="color: #6c757d; font-size: 12px;">
            This report was automatically generated by the Butchery Management System.<br>
            For questions or support, please contact your system administrator.
          </p>
        </div>
      </body>
      </html>
    `;
    }
    // Fallback method for simple PDF generation
    async generateSimplePDF(html) {
        // This is a basic fallback - in production you might want to use a different library
        const simpleHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Daily Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .section { margin-bottom: 20px; }
          .section-title { background-color: #f0f0f0; padding: 10px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Daily Business Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="section">
          <div class="section-title">Report Summary</div>
          <p>PDF generation is currently experiencing issues. Please try again later or contact support.</p>
        </div>
      </body>
      </html>
    `;
        // Return a simple HTML buffer as fallback
        return Buffer.from(simpleHtml, 'utf-8');
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
    async getDebtSummaryHTML() {
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
            if (debtData.length === 0) {
                return `
          <div style="text-align: center; padding: 20px; color: #28a745;">
            <h3>✅ No Outstanding Debts</h3>
            <p>All customers are up to date with their payments.</p>
          </div>
        `;
            }
            const totalOutstanding = debtData.reduce((sum, customer) => sum + Math.abs(customer.balance), 0);
            const customerCount = debtData.length;
            const averageDebt = totalOutstanding / customerCount;
            // Sort by debt amount (highest first)
            const topDebtors = [...debtData].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
            return `
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value negative">KSH ${totalOutstanding.toLocaleString()}</div>
            <div class="metric-label">Total Outstanding</div>
          </div>
          <div class="metric-card">
            <div class="metric-value negative">${customerCount}</div>
            <div class="metric-label">Customers with Debt</div>
          </div>
          <div class="metric-card">
            <div class="metric-value negative">KSH ${averageDebt.toFixed(0)}</div>
            <div class="metric-label">Average Debt</div>
          </div>
          <div class="metric-card">
            <div class="metric-value warning">${topDebtors.length > 0 ? topDebtors[0].name.substring(0, 15) + '...' : 'N/A'}</div>
            <div class="metric-label">Highest Debtor</div>
          </div>
        </div>

        ${topDebtors.length > 0 ? `
        <div style="margin-top: 20px;">
          <h4 style="color: #856404; margin-bottom: 15px;">Complete List of Debtors (${topDebtors.length} customers):</h4>
          <table class="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Customer Name</th>
                <th>Outstanding Balance</th>
              </tr>
            </thead>
            <tbody>
              ${topDebtors.map((debtor, index) => `
                <tr>
                  <td style="text-align: center;">${index + 1}</td>
                  <td>${debtor.name}</td>
                  <td class="negative" style="text-align: right; font-weight: bold;">KSH ${Math.abs(debtor.balance).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      `;
        }
        catch (error) {
            console.error('Error generating debt summary HTML:', error);
            return `
        <div style="text-align: center; padding: 20px; color: #6c757d;">
          <h3>⚠️ Error Loading Debt Data</h3>
          <p>Unable to load debt summary information.</p>
        </div>
      `;
        }
    }
    async generateDailyReport(date = new Date()) {
        try {
            // Try to initialize browser if not already done
            if (!this.browser) {
                await this.initialize();
            }
            if (!this.browser) {
                throw new Error('Browser initialization failed');
            }
            const html = await this.generateHTMLReport(date);
            const page = await this.browser.newPage();
            // Set a reasonable timeout for page operations
            page.setDefaultTimeout(120000); // 2 minutes
            page.setDefaultNavigationTimeout(120000);
            // Set content and wait for it to render
            await page.setContent(html, { waitUntil: 'networkidle0' });
            // Wait for dynamic content to render (using setTimeout instead of deprecated waitForTimeout)
            await new Promise(resolve => setTimeout(resolve, 2000));
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                },
                preferCSSPageSize: true
            });
            await page.close();
            return Buffer.from(pdf);
        }
        catch (error) {
            console.error('Error generating PDF report with Puppeteer:', error);
            console.log('Falling back to simple HTML generation...');
            try {
                // Try fallback method
                return await this.generateSimplePDF('');
            }
            catch (fallbackError) {
                console.error('Fallback method also failed:', fallbackError);
                // Final fallback - return a simple text-based report
                const simpleReport = this.generateTextReport(date);
                return Buffer.from(simpleReport, 'utf-8');
            }
        }
    }
    // Generate a simple text-based report as final fallback
    generateTextReport(date) {
        const reportDate = (0, date_fns_1.format)(date, 'EEEE, MMMM dd, yyyy');
        const currentTime = (0, date_fns_1.format)(new Date(), 'MMM dd, yyyy HH:mm:ss');
        return `
DAILY BUSINESS REPORT
${reportDate}
Generated on: ${currentTime}

===========================================

PDF generation is currently experiencing technical difficulties.
Please try again later or contact your system administrator.

For immediate access to your business data, please use the web interface.

===========================================

This report was automatically generated by the Butchery Management System.
For questions or support, please contact your system administrator.
    `;
    }
}
exports.PDFService = PDFService;
