import { format, subDays } from 'date-fns';

export class HTMLTemplates {
  static generateDailyReportHTML(date: Date, data: any): string {
    const formattedDate = format(date, 'EEEE, MMMM dd, yyyy');
    const generatedTime = format(new Date(), 'MMMM dd, yyyy HH:mm:ss');
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daily Business Report - ${formattedDate}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8fafc;
          }
          
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
          }
          
          .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
          }
          
          .header p {
            font-size: 1.2rem;
            opacity: 0.9;
            margin-bottom: 5px;
            position: relative;
            z-index: 1;
          }
          
          .header .subtitle {
            font-size: 0.9rem;
            opacity: 0.7;
            position: relative;
            z-index: 1;
          }
          
          .content {
            padding: 30px;
          }
          
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
          }
          
          .kpi-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
            border-left: 4px solid #2563eb;
            transition: transform 0.2s ease;
          }
          
          .kpi-card:hover {
            transform: translateY(-2px);
          }
          
          .kpi-card h3 {
            color: #64748b;
            font-size: 0.9rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
          }
          
          .kpi-card .value {
            font-size: 2rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 5px;
          }
          
          .kpi-card .change {
            font-size: 0.85rem;
            color: #059669;
            font-weight: 500;
          }
          
          .kpi-card.positive { border-left-color: #059669; }
          .kpi-card.warning { border-left-color: #d97706; }
          .kpi-card.danger { border-left-color: #dc2626; }
          .kpi-card.info { border-left-color: #0891b2; }
          
          .section {
            margin-bottom: 40px;
          }
          
          .section-header {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            padding: 20px 25px;
            border-radius: 10px;
            margin-bottom: 25px;
            border-left: 4px solid #2563eb;
          }
          
          .section-header h2 {
            color: #1e293b;
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 5px;
          }
          
          .section-header p {
            color: #64748b;
            font-size: 0.95rem;
          }
          
          .data-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          }
          
          .data-table th {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 15px 20px;
            text-align: left;
            font-weight: 600;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .data-table td {
            padding: 15px 20px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 0.9rem;
          }
          
          .data-table tr:nth-child(even) {
            background: #f8fafc;
          }
          
          .data-table tr:hover {
            background: #f1f5f9;
          }
          
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .status-success {
            background: #dcfce7;
            color: #166534;
          }
          
          .status-warning {
            background: #fef3c7;
            color: #92400e;
          }
          
          .status-danger {
            background: #fee2e2;
            color: #991b1b;
          }
          
          .chart-container {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
            margin-bottom: 30px;
          }
          
          .chart-placeholder {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            height: 200px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #64748b;
            font-size: 1.1rem;
            font-weight: 500;
          }
          
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
          }
          
          .metric-item {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          }
          
          .metric-item .label {
            font-size: 0.85rem;
            color: #64748b;
            margin-bottom: 8px;
            font-weight: 500;
          }
          
          .metric-item .value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1e293b;
          }
          
          .footer {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          
          .footer p {
            color: #64748b;
            font-size: 0.9rem;
            margin-bottom: 10px;
          }
          
          .footer .company {
            color: #2563eb;
            font-weight: 600;
          }
          
          @media print {
            body { background: white; }
            .container { box-shadow: none; }
            .kpi-card:hover { transform: none; }
            .data-table tr:hover { background: inherit; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Daily Business Report</h1>
            <p>${formattedDate}</p>
            <p class="subtitle">Generated on ${generatedTime}</p>
          </div>
          
          <div class="content">
            <!-- Executive Summary -->
            <div class="section">
              <div class="section-header">
                <h2>🎯 Executive Summary</h2>
                <p>Key performance indicators and business overview</p>
              </div>
              
              <div class="kpi-grid">
                <div class="kpi-card positive">
                  <h3>Total Sales</h3>
                  <div class="value">KSH ${data.kpi?.totalSales?.toLocaleString() || '0'}</div>
                  <div class="change">+${data.kpi?.profitMargin?.toFixed(1) || '0'}% margin</div>
                </div>
                
                <div class="kpi-card info">
                  <h3>Net Profit</h3>
                  <div class="value">KSH ${data.kpi?.netProfit?.toLocaleString() || '0'}</div>
                  <div class="change">${data.kpi?.profitMargin?.toFixed(1) || '0'}% of sales</div>
                </div>
                
                <div class="kpi-card warning">
                  <h3>Transactions</h3>
                  <div class="value">${data.kpi?.numberOfSales || '0'}</div>
                  <div class="change">${data.kpi?.averageOrderValue?.toFixed(0) || '0'} avg order</div>
                </div>
                
                <div class="kpi-card danger">
                  <h3>Outstanding</h3>
                  <div class="value">KSH ${data.kpi?.outstandingAmount?.toLocaleString() || '0'}</div>
                  <div class="change">${data.kpi?.collectionRate?.toFixed(1) || '0'}% collected</div>
                </div>
              </div>
            </div>
            
            <!-- Sales Performance -->
            <div class="section">
              <div class="section-header">
                <h2>🏆 Sales Performance</h2>
                <p>Top selling items and recent transactions</p>
              </div>
              
              ${data.topItems && data.topItems.length > 0 ? `
              <div class="chart-container">
                <h3 style="margin-bottom: 20px; color: #1e293b;">🔥 Top Selling Items</h3>
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Item Name</th>
                      <th>Quantity</th>
                      <th>Revenue</th>
                      <th>Profit</th>
                      <th>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.topItems.slice(0, 10).map((item: any, index: number) => `
                      <tr>
                        <td><strong>${index + 1}</strong></td>
                        <td>${item.name}</td>
                        <td>${item.quantity?.toFixed(2) || '0'}</td>
                        <td>KSH ${item.revenue?.toLocaleString() || '0'}</td>
                        <td>KSH ${item.profit?.toLocaleString() || '0'}</td>
                        <td>
                          <span class="status-badge ${item.profitMargin > 20 ? 'status-success' : item.profitMargin > 10 ? 'status-warning' : 'status-danger'}">
                            ${item.profitMargin?.toFixed(1) || '0'}%
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              ` : ''}
              
              ${data.recentSales && data.recentSales.length > 0 ? `
              <div class="chart-container">
                <h3 style="margin-bottom: 20px; color: #1e293b;">🕒 Recent Transactions</h3>
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Payment</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.recentSales.slice(0, 10).map((sale: any) => `
                      <tr>
                        <td><strong>#${sale.id}</strong></td>
                        <td>${sale.customer}</td>
                        <td>KSH ${sale.amount?.toLocaleString() || '0'}</td>
                        <td>${sale.paymentType}</td>
                        <td>${format(new Date(sale.date), 'MMM dd, HH:mm')}</td>
                        <td>
                          <span class="status-badge ${sale.paid === sale.amount ? 'status-success' : 'status-warning'}">
                            ${sale.paid === sale.amount ? 'Paid' : 'Partial'}
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              ` : ''}
            </div>
            
            <!-- Financial Analysis -->
            <div class="section">
              <div class="section-header">
                <h2>💰 Financial Analysis</h2>
                <p>Profit & Loss and Cash Flow insights</p>
              </div>
              
              <div class="metrics-grid">
                <div class="metric-item">
                  <div class="label">Total Revenue</div>
                  <div class="value">KSH ${data.financial?.totalRevenue?.toLocaleString() || '0'}</div>
                </div>
                <div class="metric-item">
                  <div class="label">Total Cost</div>
                  <div class="value">KSH ${data.financial?.totalCost?.toLocaleString() || '0'}</div>
                </div>
                <div class="metric-item">
                  <div class="label">Gross Profit</div>
                  <div class="value">KSH ${data.financial?.grossProfit?.toLocaleString() || '0'}</div>
                </div>
                <div class="metric-item">
                  <div class="label">Net Profit</div>
                  <div class="value">KSH ${data.financial?.netProfit?.toLocaleString() || '0'}</div>
                </div>
              </div>
              
              <div class="chart-container">
                <h3 style="margin-bottom: 20px; color: #1e293b;">📈 Cash Flow Analysis</h3>
                <div class="metrics-grid">
                  <div class="metric-item">
                    <div class="label">Cash Inflow</div>
                    <div class="value">KSH ${data.financial?.cashInflow?.toLocaleString() || '0'}</div>
                  </div>
                  <div class="metric-item">
                    <div class="label">Cash Outflow</div>
                    <div class="value">KSH ${data.financial?.cashOutflow?.toLocaleString() || '0'}</div>
                  </div>
                  <div class="metric-item">
                    <div class="label">Net Cash Flow</div>
                    <div class="value">KSH ${data.financial?.netCashFlow?.toLocaleString() || '0'}</div>
                  </div>
                  <div class="metric-item">
                    <div class="label">Collection Rate</div>
                    <div class="value">${data.financial?.collectionRate?.toFixed(1) || '0'}%</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Inventory Status -->
            <div class="section">
              <div class="section-header">
                <h2>📦 Inventory Status</h2>
                <p>Stock levels and inventory alerts</p>
              </div>
              
              <div class="metrics-grid">
                <div class="metric-item">
                  <div class="label">Total Items</div>
                  <div class="value">${data.inventory?.summary?.totalItems || '0'}</div>
                </div>
                <div class="metric-item">
                  <div class="label">Total Value</div>
                  <div class="value">KSH ${data.inventory?.summary?.totalValue?.toLocaleString() || '0'}</div>
                </div>
                <div class="metric-item">
                  <div class="label">Low Stock Items</div>
                  <div class="value">${data.inventory?.summary?.lowStockItems || '0'}</div>
                </div>
                <div class="metric-item">
                  <div class="label">Out of Stock</div>
                  <div class="value">${data.inventory?.summary?.outOfStock || '0'}</div>
                </div>
              </div>
              
              ${data.inventory?.lowStockAlerts && data.inventory.lowStockAlerts.length > 0 ? `
              <div class="chart-container">
                <h3 style="margin-bottom: 20px; color: #1e293b;">⚠️ Low Stock Alerts</h3>
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Current Stock</th>
                      <th>Min Required</th>
                      <th>Unit</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.inventory.lowStockAlerts.slice(0, 8).map((item: any) => `
                      <tr>
                        <td><strong>${item.name}</strong></td>
                        <td>${item.category}</td>
                        <td>${item.quantity}</td>
                        <td>${item.lowStockLimit}</td>
                        <td>${item.unit}</td>
                        <td>
                          <span class="status-badge ${item.quantity === 0 ? 'status-danger' : 'status-warning'}">
                            ${item.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              ` : ''}
            </div>
            
            <!-- Customer Analytics -->
            <div class="section">
              <div class="section-header">
                <h2>👥 Customer Analytics</h2>
                <p>Customer behavior and debt analysis</p>
              </div>
              
              <div class="metrics-grid">
                <div class="metric-item">
                  <div class="label">Total Customers</div>
                  <div class="value">${data.customers?.summary?.totalCustomers || '0'}</div>
                </div>
                <div class="metric-item">
                  <div class="label">Active Customers</div>
                  <div class="value">${data.customers?.summary?.activeCustomers || '0'}</div>
                </div>
                <div class="metric-item">
                  <div class="label">New Customers</div>
                  <div class="value">${data.customers?.summary?.newCustomers || '0'}</div>
                </div>
                <div class="metric-item">
                  <div class="label">Avg Order Value</div>
                  <div class="value">KSH ${data.customers?.summary?.averageOrderValue?.toFixed(0) || '0'}</div>
                </div>
              </div>
              
              ${data.customers?.debtSummary ? `
              <div class="chart-container">
                <h3 style="margin-bottom: 20px; color: #1e293b;">💳 Outstanding Debts</h3>
                <div class="metrics-grid">
                  <div class="metric-item">
                    <div class="label">Total Outstanding</div>
                    <div class="value">KSH ${data.customers.debtSummary.totalOutstanding?.toLocaleString() || '0'}</div>
                  </div>
                  <div class="metric-item">
                    <div class="label">Customers in Debt</div>
                    <div class="value">${data.customers.debtSummary.customerCount || '0'}</div>
                  </div>
                  <div class="metric-item">
                    <div class="label">Average Debt</div>
                    <div class="value">KSH ${data.customers.debtSummary.averageDebt?.toFixed(0) || '0'}</div>
                  </div>
                </div>
                
                ${data.customers.debtSummary.topDebtors && data.customers.debtSummary.topDebtors.length > 0 ? `
                <h4 style="margin: 20px 0 15px 0; color: #1e293b;">Top Debtors</h4>
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.customers.debtSummary.topDebtors.slice(0, 5).map((debtor: any) => `
                      <tr>
                        <td><strong>${debtor.name}</strong></td>
                        <td>KSH ${Math.abs(debtor.balance || 0).toLocaleString()}</td>
                        <td>
                          <span class="status-badge status-danger">Outstanding</span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                ` : ''}
              </div>
              ` : ''}
            </div>
            
            <!-- Expenses Analysis -->
            ${data.expenses ? `
            <div class="section">
              <div class="section-header">
                <h2>💸 Expenses Analysis</h2>
                <p>Expense breakdown and category analysis</p>
              </div>
              
              <div class="metrics-grid">
                <div class="metric-item">
                  <div class="label">Total Expenses</div>
                  <div class="value">KSH ${data.expenses.summary?.totalAmount?.toLocaleString() || '0'}</div>
                </div>
                <div class="metric-item">
                  <div class="label">Transactions</div>
                  <div class="value">${data.expenses.summary?.count || '0'}</div>
                </div>
                <div class="metric-item">
                  <div class="label">Average Transaction</div>
                  <div class="value">KSH ${data.expenses.summary?.averageAmount?.toFixed(0) || '0'}</div>
                </div>
              </div>
              
              ${data.expenses.topCategories && data.expenses.topCategories.length > 0 ? `
              <div class="chart-container">
                <h3 style="margin-bottom: 20px; color: #1e293b;">📊 Expenses by Category</h3>
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.expenses.topCategories.map((category: any) => `
                      <tr>
                        <td><strong>${category.category}</strong></td>
                        <td>KSH ${category.amount?.toLocaleString() || '0'}</td>
                        <td>${category.percentage?.toFixed(1) || '0'}%</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              ` : ''}
            </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>This report was automatically generated by the <span class="company">Butchery Management System</span></p>
            <p>For questions or support, please contact your system administrator</p>
            <p style="margin-top: 15px; font-size: 0.8rem; color: #94a3b8;">
              Report generated on ${generatedTime} | Page 1 of 1
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
