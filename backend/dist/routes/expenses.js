"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get all expenses
router.get("/", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const expenses = await prisma.expense.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(expenses);
    }
    catch (error) {
        console.error("Error fetching expenses:", error);
        res.status(500).json({ error: "Failed to fetch expenses" });
    }
});
// Get expenses by month
router.get("/monthly/:year/:month", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { year, month } = req.params;
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
        const expenses = await prisma.expense.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { date: 'desc' }
        });
        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        res.json({
            expenses,
            summary: {
                totalAmount,
                count: expenses.length,
                month: month,
                year: year
            }
        });
    }
    catch (error) {
        console.error("Error fetching monthly expenses:", error);
        res.status(500).json({ error: "Failed to fetch monthly expenses" });
    }
});
// Get expense by ID
router.get("/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const expense = await prisma.expense.findUnique({
            where: { id: parseInt(id) }
        });
        if (!expense) {
            return res.status(404).json({ error: "Expense not found" });
        }
        res.json(expense);
    }
    catch (error) {
        console.error("Error fetching expense:", error);
        res.status(500).json({ error: "Failed to fetch expense" });
    }
});
// Create new expense (Admin only)
router.post("/", authMiddleware_1.authenticateToken, async (req, res) => {
    // Check if user is admin
    const userRole = req.role;
    if (userRole !== 'ADMIN') {
        return res.status(403).json({
            error: 'Admin access required',
            message: 'Only administrators can create expenses'
        });
    }
    try {
        const { amount, reason, recipient, date, notes, category } = req.body;
        if (!amount || !reason || !recipient) {
            return res.status(400).json({
                error: "Amount, reason, and recipient are required"
            });
        }
        const expense = await prisma.expense.create({
            data: {
                amount: parseFloat(amount),
                reason,
                recipient,
                date: date ? new Date(date) : new Date(),
                notes: notes || null,
                category: category || "General"
            }
        });
        res.status(201).json(expense);
    }
    catch (error) {
        console.error("Error creating expense:", error);
        res.status(500).json({ error: "Failed to create expense" });
    }
});
// Update expense (Admin only)
router.put("/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    // Check if user is admin
    const userRole = req.role;
    if (userRole !== 'ADMIN') {
        return res.status(403).json({
            error: 'Admin access required',
            message: 'Only administrators can update expenses'
        });
    }
    try {
        const { id } = req.params;
        const { amount, reason, recipient, date, notes, category } = req.body;
        const existingExpense = await prisma.expense.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existingExpense) {
            return res.status(404).json({ error: "Expense not found" });
        }
        const updatedExpense = await prisma.expense.update({
            where: { id: parseInt(id) },
            data: {
                amount: amount ? parseFloat(amount) : undefined,
                reason: reason || undefined,
                recipient: recipient || undefined,
                date: date ? new Date(date) : undefined,
                notes: notes !== undefined ? notes : undefined,
                category: category || undefined
            }
        });
        res.json(updatedExpense);
    }
    catch (error) {
        console.error("Error updating expense:", error);
        res.status(500).json({ error: "Failed to update expense" });
    }
});
// Delete expense (Admin only)
router.delete("/:id", authMiddleware_1.authenticateToken, async (req, res) => {
    // Check if user is admin
    const userRole = req.role;
    console.log('Delete expense - User ID:', req.userId, 'Role:', userRole);
    if (userRole !== 'ADMIN') {
        console.log('Delete expense - Access denied for user:', req.userId);
        return res.status(403).json({
            error: 'Admin access required',
            message: 'Only administrators can delete expenses'
        });
    }
    console.log('Delete expense - Access granted for user:', req.userId);
    try {
        const { id } = req.params;
        const existingExpense = await prisma.expense.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existingExpense) {
            return res.status(404).json({ error: "Expense not found" });
        }
        await prisma.expense.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: "Expense deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting expense:", error);
        res.status(500).json({ error: "Failed to delete expense" });
    }
});
// Get expense categories
router.get("/categories", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const categories = await prisma.expense.groupBy({
            by: ['category'],
            _count: {
                category: true
            }
        });
        res.json(categories.map((cat) => ({
            category: cat.category,
            count: cat._count.category
        })));
    }
    catch (error) {
        console.error("Error fetching expense categories:", error);
        res.status(500).json({ error: "Failed to fetch categories" });
    }
});
// Download monthly expense report (Admin only)
router.get("/monthly/:year/:month/report", authMiddleware_1.authenticateToken, async (req, res) => {
    // Check if user is admin
    const userRole = req.role;
    console.log('Download report - User ID:', req.userId, 'Role:', userRole);
    if (userRole !== 'ADMIN') {
        console.log('Download report - Access denied for user:', req.userId);
        return res.status(403).json({
            error: 'Admin access required',
            message: 'Only administrators can download expense reports'
        });
    }
    console.log('Download report - Access granted for user:', req.userId);
    try {
        const { year, month } = req.params;
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
        const expenses = await prisma.expense.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { date: 'desc' }
        });
        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        // Generate HTML report
        const html = generateExpenseReportHTML(expenses, {
            year: parseInt(year),
            month: parseInt(month),
            totalAmount,
            count: expenses.length
        });
        // For now, return HTML content (you can integrate with PDF service later)
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="expenses-report-${year}-${month.padStart(2, '0')}.html"`);
        res.send(html);
    }
    catch (error) {
        console.error("Error generating expense report:", error);
        res.status(500).json({ error: "Failed to generate expense report" });
    }
});
// Download comprehensive monthly report (expenses + sales + other data) (Admin only)
router.get("/monthly/:year/:month/comprehensive", authMiddleware_1.authenticateToken, async (req, res) => {
    // Check if user is admin
    const userRole = req.role;
    if (userRole !== 'ADMIN') {
        return res.status(403).json({
            error: 'Admin access required',
            message: 'Only administrators can download comprehensive reports'
        });
    }
    try {
        const { year, month } = req.params;
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
        // Fetch expenses for the month
        const expenses = await prisma.expense.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { date: 'desc' }
        });
        // Fetch sales for the month
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
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
        // Fetch inventory status
        const inventory = await prisma.inventoryItem.findMany();
        // Calculate summaries
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalPaid = sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
        const outstandingAmount = totalSales - totalPaid;
        const netProfit = totalSales - totalExpenses;
        // Generate comprehensive HTML report
        const html = generateComprehensiveReportHTML({
            year: parseInt(year),
            month: parseInt(month),
            expenses,
            sales,
            inventory,
            summary: {
                totalExpenses,
                totalSales,
                totalPaid,
                outstandingAmount,
                netProfit,
                expenseCount: expenses.length,
                saleCount: sales.length
            }
        });
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="comprehensive-report-${year}-${month.padStart(2, '0')}.html"`);
        res.send(html);
    }
    catch (error) {
        console.error("Error generating comprehensive report:", error);
        res.status(500).json({ error: "Failed to generate comprehensive report" });
    }
});
// Helper function to generate HTML report
function generateExpenseReportHTML(expenses, summary) {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[summary.month - 1];
    const currentDate = new Date().toLocaleDateString();
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Expenses Report - ${monthName} ${summary.year}</title>
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
        .summary {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin-bottom: 30px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-value {
          font-size: 24px;
          font-weight: bold;
          color: #dc3545;
        }
        .summary-label {
          font-size: 14px;
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
          padding: 12px;
          text-align: left;
        }
        .table th {
          background-color: #f8f9fa;
          font-weight: bold;
        }
        .amount {
          text-align: right;
          font-weight: bold;
        }
        .category {
          background-color: #e9ecef;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 12px;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          border-top: 1px solid #dee2e6;
          padding-top: 20px;
          color: #6c757d;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Monthly Expenses Report</h1>
        <h2>${monthName} ${summary.year}</h2>
        <p>Generated on: ${currentDate}</p>
      </div>

      <div class="summary">
        <h3>Summary</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-value">KSH ${summary.totalAmount.toLocaleString()}</div>
            <div class="summary-label">Total Expenses</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${summary.count}</div>
            <div class="summary-label">Number of Expenses</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">KSH ${summary.count > 0 ? (summary.totalAmount / summary.count).toFixed(0) : '0'}</div>
            <div class="summary-label">Average per Expense</div>
          </div>
        </div>
      </div>

      <h3>Expense Details</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Recipient</th>
            <th>Reason</th>
            <th>Category</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${expenses.map((expense) => `
            <tr>
              <td>${new Date(expense.date).toLocaleDateString()}</td>
              <td class="amount">KSH ${expense.amount.toLocaleString()}</td>
              <td>${expense.recipient}</td>
              <td>${expense.reason}</td>
              <td><span class="category">${expense.category}</span></td>
              <td>${expense.notes || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>This report was automatically generated by the Butchery Management System.</p>
        <p>For questions or support, please contact your system administrator.</p>
      </div>
    </body>
    </html>
  `;
}
// Helper function to generate comprehensive HTML report
function generateComprehensiveReportHTML(data) {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[data.month - 1];
    const currentDate = new Date().toLocaleDateString();
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Comprehensive Monthly Report - ${monthName} ${data.year}</title>
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
        .summary {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin-bottom: 30px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-value {
          font-size: 20px;
          font-weight: bold;
        }
        .summary-value.positive { color: #28a745; }
        .summary-value.negative { color: #dc3545; }
        .summary-value.neutral { color: #007bff; }
        .summary-label {
          font-size: 12px;
          color: #6c757d;
          margin-top: 5px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          background-color: #e9ecef;
          padding: 10px;
          font-weight: bold;
          margin-bottom: 15px;
          border-radius: 5px;
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
          font-size: 12px;
        }
        .table th {
          background-color: #f8f9fa;
          font-weight: bold;
        }
        .amount {
          text-align: right;
          font-weight: bold;
        }
        .category {
          background-color: #e9ecef;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          border-top: 1px solid #dee2e6;
          padding-top: 20px;
          color: #6c757d;
          font-size: 12px;
        }
        .page-break { page-break-before: always; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Comprehensive Monthly Business Report</h1>
        <h2>${monthName} ${data.year}</h2>
        <p>Generated on: ${currentDate}</p>
      </div>

      <div class="summary">
        <h3>Monthly Summary</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-value positive">KSH ${data.summary.totalSales.toLocaleString()}</div>
            <div class="summary-label">Total Sales</div>
          </div>
          <div class="summary-item">
            <div class="summary-value negative">KSH ${data.summary.totalExpenses.toLocaleString()}</div>
            <div class="summary-label">Total Expenses</div>
          </div>
          <div class="summary-item">
            <div class="summary-value ${data.summary.netProfit >= 0 ? 'positive' : 'negative'}">KSH ${data.summary.netProfit.toLocaleString()}</div>
            <div class="summary-label">Net Profit</div>
          </div>
          <div class="summary-item">
            <div class="summary-value neutral">KSH ${data.summary.outstandingAmount.toLocaleString()}</div>
            <div class="summary-label">Outstanding</div>
          </div>
        </div>
        
        <div class="summary-grid" style="margin-top: 20px;">
          <div class="summary-item">
            <div class="summary-value neutral">${data.summary.saleCount}</div>
            <div class="summary-label">Sales Transactions</div>
          </div>
          <div class="summary-item">
            <div class="summary-value neutral">${data.summary.expenseCount}</div>
            <div class="summary-label">Expenses</div>
          </div>
          <div class="summary-item">
            <div class="summary-value neutral">${data.inventory.length}</div>
            <div class="summary-label">Inventory Items</div>
          </div>
          <div class="summary-item">
            <div class="summary-value neutral">${data.summary.totalPaid.toLocaleString()}</div>
            <div class="summary-label">Total Collected</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">📊 Sales Summary</div>
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Outstanding</th>
              <th>Payment Type</th>
            </tr>
          </thead>
          <tbody>
            ${data.sales.map((sale) => `
              <tr>
                <td>${new Date(sale.createdAt).toLocaleDateString()}</td>
                <td>${sale.customer.name}</td>
                <td class="amount">KSH ${sale.totalAmount.toLocaleString()}</td>
                <td class="amount">KSH ${sale.paidAmount.toLocaleString()}</td>
                <td class="amount">KSH ${(sale.totalAmount - sale.paidAmount).toLocaleString()}</td>
                <td>${sale.paymentType}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="page-break"></div>

      <div class="section">
        <div class="section-title">💰 Expenses Summary</div>
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Recipient</th>
              <th>Reason</th>
              <th>Category</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${data.expenses.map((expense) => `
              <tr>
                <td>${new Date(expense.date).toLocaleDateString()}</td>
                <td class="amount">KSH ${expense.amount.toLocaleString()}</td>
                <td>${expense.recipient}</td>
                <td>${expense.reason}</td>
                <td><span class="category">${expense.category}</span></td>
                <td>${expense.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">📦 Inventory Status</div>
        <table class="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Base Price</th>
              <th>Sell Price</th>
              <th>Total Value</th>
            </tr>
          </thead>
          <tbody>
            ${data.inventory.map((item) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.quantity}</td>
                <td>${item.unit}</td>
                <td class="amount">KSH ${(item.basePrice || 0).toLocaleString()}</td>
                <td class="amount">KSH ${(item.sellPrice || 0).toLocaleString()}</td>
                <td class="amount">KSH ${((item.sellPrice || 0) * item.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>This comprehensive report was automatically generated by the Butchery Management System.</p>
        <p>For questions or support, please contact your system administrator.</p>
      </div>
    </body>
    </html>
  `;
}
exports.default = router;
