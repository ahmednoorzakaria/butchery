import nodemailer from 'nodemailer';
import { format } from 'date-fns';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email settings
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // You can change this to other services like 'outlook', 'yahoo', etc.
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password', // Use app password for Gmail
      },
    });
  }

  async sendDailyReport(
    recipientEmail: string,
    pdfBuffer: Buffer,
    date: Date = new Date(),
    debtSummary?: { totalOutstanding: number; customerCount: number; topDebtors: Array<{ name: string; balance: number }> }
  ): Promise<boolean> {
    try {
      const formattedDate = format(date, 'EEEE, MMMM dd, yyyy');
      const fileName = `daily-report-${format(date, 'yyyy-MM-dd')}.pdf`;

      const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: recipientEmail,
        subject: `Daily Business Report - ${formattedDate}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px;">
              <h1 style="color: #333; margin: 0;">📊 Daily Business Report</h1>
              <p style="color: #666; margin: 10px 0 0 0;">${formattedDate}</p>
            </div>
            
            <div style="padding: 20px;">
              <p>Hello,</p>
              
              <p>Please find attached the daily business report for <strong>${formattedDate}</strong>.</p>
              
              ${debtSummary ? `
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h3 style="margin: 0 0 10px 0; color: #856404;">⚠️ Debt Summary</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                  <div style="text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #dc3545;">KSH ${debtSummary.totalOutstanding.toLocaleString()}</div>
                    <div style="font-size: 12px; color: #856404;">Total Outstanding</div>
                  </div>
                  <div style="text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #dc3545;">${debtSummary.customerCount}</div>
                    <div style="font-size: 12px; color: #856404;">Customers with Debt</div>
                  </div>
                </div>
                ${debtSummary.topDebtors.length > 0 ? `
                <div style="margin-top: 15px;">
                  <h4 style="margin: 0 0 10px 0; color: #856404;">All Debtors (${debtSummary.customerCount} customers):</h4>
                  ${debtSummary.topDebtors.map(debtor => `
                    <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #ffeaa7;">
                      <span style="color: #856404;">${debtor.name}</span>
                      <span style="font-weight: bold; color: #dc3545;">KSH ${Math.abs(debtor.balance).toLocaleString()}</span>
                    </div>
                  `).join('')}
                </div>
                ` : ''}
              </div>
              ` : ''}
              
              <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #495057;">📋 Report Summary</h3>
                <ul style="margin: 0; padding-left: 20px; color: #495057;">
                  <li>Sales Summary and Metrics</li>
                  <li>Top Selling Items</li>
                  <li>Recent Sales Transactions</li>
                  <li>Profit & Loss Analysis</li>
                  <li>Inventory Status</li>
                  <li>Cash Flow Summary</li>
                  <li>Customer Analysis</li>
                  ${debtSummary ? '<li>Debt Summary and Outstanding Balances</li>' : ''}
                </ul>
              </div>
              
              <p>This report contains comprehensive data about your business performance for the day, including:</p>
              
              <ul style="color: #495057;">
                <li>Total sales and revenue figures</li>
                <li>Profit margins and cost analysis</li>
                <li>Inventory valuation and stock levels</li>
                <li>Customer spending patterns</li>
                <li>Payment collection rates</li>
                <li>Top performing products</li>
                ${debtSummary ? '<li>Outstanding debts and customer balances</li>' : ''}
              </ul>
              
              <p>If you have any questions about this report or need additional information, please don't hesitate to contact us.</p>
              
              <p>Best regards,<br>
              <strong>Butchery Management System</strong></p>
              
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
              <p style="font-size: 12px; color: #6c757d; text-align: center;">
                This is an automated email generated by the Butchery Management System.<br>
                Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Daily report email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Error sending daily report email:', error);
      return false;
    }
  }

  async sendDebtSummaryEmail(
    recipientEmail: string,
    debtData: {
      totalOutstanding: number;
      customerCount: number;
      topDebtors: Array<{ name: string; balance: number; customerId: number }>;
      allDebtors: Array<{ name: string; balance: number; customerId: number }>;
    },
    date: Date = new Date()
  ): Promise<boolean> {
    try {
      const formattedDate = format(date, 'EEEE, MMMM dd, yyyy');
      
      const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: recipientEmail,
        subject: `🚨 Debt Summary Report - ${formattedDate}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
            <div style="background-color: #dc3545; padding: 20px; text-align: center; border-radius: 5px;">
              <h1 style="color: white; margin: 0;">🚨 Debt Summary Report</h1>
              <p style="color: #f8d7da; margin: 10px 0 0 0;">${formattedDate}</p>
            </div>
            
            <div style="padding: 20px;">
              <p>Hello,</p>
              
              <p>Here's your <strong>debt summary report</strong> for <strong>${formattedDate}</strong>.</p>
              
              <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
                <h2 style="margin: 0 0 15px 0; color: #721c24;">📊 Summary Overview</h2>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0;">
                  <div style="text-align: center; background: white; padding: 15px; border-radius: 5px;">
                    <div style="font-size: 28px; font-weight: bold; color: #dc3545;">KSH ${debtData.totalOutstanding.toLocaleString()}</div>
                    <div style="font-size: 14px; color: #721c24;">Total Outstanding</div>
                  </div>
                  <div style="text-align: center; background: white; padding: 15px; border-radius: 5px;">
                    <div style="font-size: 28px; font-weight: bold; color: #dc3545;">${debtData.customerCount}</div>
                    <div style="font-size: 14px; color: #721c24;">Customers with Debt</div>
                  </div>
                  <div style="text-align: center; background: white; padding: 15px; border-radius: 5px;">
                    <div style="font-size: 28px; font-weight: bold; color: #dc3545;">KSH ${(debtData.totalOutstanding / debtData.customerCount).toFixed(0)}</div>
                    <div style="font-size: 14px; color: #721c24;">Average Debt</div>
                  </div>
                </div>
              </div>
              
              <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h3 style="margin: 0 0 15px 0; color: #856404;">⚠️ Top 10 Debtors</h3>
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="background-color: #ffeaa7;">
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #fdcb6e; color: #856404;">Rank</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #fdcb6e; color: #856404;">Customer Name</th>
                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #fdcb6e; color: #856404;">Outstanding Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${debtData.topDebtors.slice(0, 10).map((debtor, index) => `
                        <tr style="border-bottom: 1px solid #ffeaa7;">
                          <td style="padding: 10px; color: #856404;">${index + 1}</td>
                          <td style="padding: 10px; color: #856404; font-weight: 500;">${debtor.name}</td>
                          <td style="padding: 10px; text-align: right; font-weight: bold; color: #dc3545;">KSH ${Math.abs(debtor.balance).toLocaleString()}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
              
              ${debtData.allDebtors.length > 10 ? `
              <div style="background-color: #e9ecef; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #495057;">📋 Complete Debt List</h3>
                <p style="color: #6c757d; margin-bottom: 15px;">Showing all ${debtData.allDebtors.length} customers with outstanding balances:</p>
                <div style="max-height: 400px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 5px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead style="position: sticky; top: 0; background-color: #f8f9fa;">
                      <tr>
                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6; color: #495057;">Customer</th>
                        <th style="padding: 8px; text-align: right; border-bottom: 1px solid #dee2e6; color: #495057;">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${debtData.allDebtors.map((debtor, index) => `
                        <tr style="background-color: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
                          <td style="padding: 8px; color: #495057;">${debtor.name}</td>
                          <td style="padding: 8px; text-align: right; font-weight: 500; color: #dc3545;">KSH ${Math.abs(debtor.balance).toLocaleString()}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
              ` : ''}
              
              <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                <h3 style="margin: 0 0 10px 0; color: #0c5460;">💡 Action Items</h3>
                <ul style="margin: 0; padding-left: 20px; color: #0c5460;">
                  <li>Contact customers with the highest outstanding balances</li>
                  <li>Set up payment plans for customers with large debts</li>
                  <li>Review credit policies for future sales</li>
                  <li>Consider offering discounts for early debt settlement</li>
                </ul>
              </div>
              
              <p>This debt summary helps you stay on top of your accounts receivable and take proactive steps to collect outstanding payments.</p>
              
              <p>Best regards,<br>
              <strong>Butchery Management System</strong></p>
              
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
              <p style="font-size: 12px; color: #6c757d; text-align: center;">
                This is an automated debt summary email generated by the Butchery Management System.<br>
                Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Debt summary email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Error sending debt summary email:', error);
      return false;
    }
  }

  async sendTestEmail(recipientEmail: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: recipientEmail,
        subject: 'Test Email - Butchery Management System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px;">
              <h1 style="color: #333; margin: 0;">✅ Email Configuration Test</h1>
            </div>
            
            <div style="padding: 20px;">
              <p>Hello,</p>
              
              <p>This is a test email to verify that the email configuration for the Butchery Management System is working correctly.</p>
              
              <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin: 0; color: #155724;">🎉 Success!</h3>
                <p style="margin: 10px 0 0 0; color: #155724;">
                  Your email configuration is working properly. Daily reports will be sent automatically at midnight.
                </p>
              </div>
              
              <p>If you received this email, it means:</p>
              <ul style="color: #495057;">
                <li>Email service is properly configured</li>
                <li>SMTP settings are correct</li>
                <li>Authentication is working</li>
                <li>Daily reports will be sent automatically</li>
              </ul>
              
              <p>Best regards,<br>
              <strong>Butchery Management System</strong></p>
            </div>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Test email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Error sending test email:', error);
      return false;
    }
  }
}
