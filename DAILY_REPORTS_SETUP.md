# Daily Reports Setup Guide

This guide will help you set up the automatic daily reports feature that generates PDF reports and sends them via email every day at midnight.

## Features

- 📊 **Comprehensive Daily Reports**: Sales summary, profit analysis, inventory status, cash flow, and customer analysis
- 📧 **Automatic Email Delivery**: Reports sent automatically at midnight every day
- 🔧 **Manual Generation**: Generate and send reports on-demand
- 📱 **Web Interface**: Manage settings and test configuration through the web interface
- 📄 **PDF Format**: Professional PDF reports with charts and tables

## Setup Instructions

### 1. Install Dependencies

The required packages have already been installed:
- `puppeteer` - For PDF generation
- `nodemailer` - For email sending
- `node-cron` - For scheduling

### 2. Email Configuration

#### For Gmail:
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Use the app password instead of your regular password

#### For Other Email Services:
- **Outlook**: Use your regular password or app password
- **Yahoo**: Use an app-specific password
- **Custom SMTP**: Configure SMTP settings manually

### 3. Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Database
DATABASE_URL="file:./dev.db"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-here"

# Email Configuration
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
EMAIL_SERVICE="gmail"

# Server Configuration
PORT=3001
NODE_ENV=development
```

### 4. Start the Application

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

### 5. Configure Daily Reports

1. Navigate to `/daily-reports` in your application
2. Configure your email settings:
   - Enter your email address
   - Enter your app password
   - Select your email service
3. Test the email configuration
4. The scheduler will automatically start and run daily at midnight

## Usage

### Automatic Reports
- Reports are automatically generated and sent every day at midnight
- All admin users will receive the reports via email
- Reports include comprehensive business data for the previous day

### Manual Generation
- Use the "Manual Report Generation" section to generate reports on-demand
- Specify a recipient email or leave empty to send to all admin users
- Useful for testing or generating reports for specific dates

### Report Actions
- **Preview**: View reports in the browser
- **Download**: Download PDF reports to your device
- **Test Email**: Send test emails to verify configuration

## Report Content

Each daily report includes:

### 📊 Sales Summary
- Total sales and revenue
- Collections vs outstanding amounts
- Number of transactions
- Average order value
- Profit margins and collection rates

### 🏆 Top Selling Items
- Best performing products
- Revenue and profit by item
- Quantity sold

### 🛒 Recent Sales
- Latest transactions
- Customer details
- Payment information

### 💰 Profit & Loss Analysis
- Revenue vs costs
- Profit margins
- Top performing items
- Category breakdown

### 📦 Inventory Status
- Current stock levels
- Total inventory value
- Potential profit
- Category distribution

### 💳 Cash Flow Summary
- Revenue vs collections
- Outstanding amounts
- Collection rates
- Payment method analysis

### 👥 Customer Analysis
- Customer spending patterns
- Order frequency
- Average order values
- Active vs total customers

## Troubleshooting

### Email Not Sending
1. Check your email configuration
2. Verify app password is correct
3. Test email configuration using the test feature
4. Check server logs for error messages

### PDF Generation Issues
1. Ensure Puppeteer is properly installed
2. Check server has sufficient memory
3. Verify database connection

### Scheduler Not Running
1. Check server logs for initialization errors
2. Verify timezone settings
3. Restart the server

## Security Notes

- Store email passwords securely
- Use environment variables for sensitive data
- Regularly update app passwords
- Monitor email sending logs

## Customization

### Report Schedule
To change the schedule, modify the cron expression in `schedulerService.ts`:
```javascript
// Current: Run at midnight every day
cron.schedule('0 0 * * *', async () => {
  // Your code here
});

// Examples:
// '0 6 * * *' - Run at 6 AM every day
// '0 0 * * 1' - Run at midnight every Monday
// '0 0 1 * *' - Run at midnight on the 1st of every month
```

### Report Content
To customize report content, modify the `generateHTMLReport` method in `pdfService.ts`.

### Email Template
To customize email templates, modify the `sendDailyReport` method in `emailService.ts`.

## Support

For issues or questions:
1. Check the server logs for error messages
2. Verify all configuration settings
3. Test email configuration
4. Ensure all dependencies are installed

The daily reports feature provides comprehensive business insights automatically, helping you stay informed about your business performance every day.
