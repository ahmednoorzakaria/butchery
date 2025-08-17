import { useRef } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { businessConfig } from "@/config/business";

interface SaleItem {
  itemId: number;
  quantity: number;
  price: number;
  item?: {
    name: string;
    unit: string;
    category: string;
    subtype?: string;
  };
}

interface Customer {
  id: number;
  name: string;
  phone: string;
}

interface User {
  id: number;
  name: string;
}

interface Sale {
  id: number;
  customerId: number;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  paymentType: string;
  notes?: string;
  createdAt: string;
  customer: Customer;
  user: User;
  userId: number;
  items: SaleItem[];
}

interface ReceiptProps {
  sale: Sale;
}

export function Receipt({ sale }: ReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number) => {
    return `KSH ${amount.toLocaleString()}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const isMeatProduct = (category: string) => {
    return ['meat', 'beef', 'chicken', 'goat', 'lamb', 'pork'].includes(category.toLowerCase());
  };

  const printReceipt = (sale: Sale) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const { date, time } = formatDateTime(sale.createdAt);
    const receiptNumber = `RCP-${String(sale.id).padStart(6, '0')}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${receiptNumber}</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            
            body { 
              font-family: 'Courier New', monospace; 
              margin: 10px; 
              font-size: 10px;
              line-height: 1.2;
              width: 80mm;
              max-width: 80mm;
            }
            
            .header { 
              text-align: center; 
              border-bottom: 1px solid #000; 
              padding-bottom: 10px; 
              margin-bottom: 15px; 
            }
            
            .business-name { 
              font-size: 16px; 
              font-weight: bold; 
              margin-bottom: 5px; 
              text-transform: uppercase;
              color: #000;
            }
            
            .business-tagline { 
              font-size: 11px; 
              color: #333; 
              margin-bottom: 5px;
            }
            
            .business-info { 
              font-size: 9px; 
              color: #666; 
              margin-bottom: 2px;
            }
            
            .till-number {
              font-size: 10px;
              font-weight: bold;
              color: #000;
              margin: 8px 0;
              padding: 5px;
              border: 1px solid #000;
              background-color: #f0f0f0;
            }
            
            .receipt-details { 
              margin-bottom: 15px; 
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 5px;
              font-size: 9px;
            }
            
            .receipt-details div { 
              margin-bottom: 3px; 
            }
            
            .receipt-details .label { 
              font-weight: bold; 
              color: #333;
            }
            
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 15px; 
              font-size: 9px;
            }
            
            .items-table th, .items-table td { 
              border: 1px solid #000; 
              padding: 3px; 
              text-align: left; 
              vertical-align: top;
            }
            
            .items-table th { 
              background-color: #f0f0f0; 
              font-weight: bold;
              text-align: center;
              font-size: 8px;
            }
            
            .items-table .item-name { 
              font-weight: bold; 
              color: #000;
              font-size: 9px;
            }
            
            .items-table .item-subtype { 
              font-size: 8px; 
              color: #666; 
              font-style: italic;
            }
            
            .totals { 
              border-top: 1px solid #000; 
              padding-top: 10px; 
              margin-bottom: 15px;
            }
            
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 5px; 
              font-size: 10px;
            }
            
            .total-row.final { 
              font-weight: bold; 
              font-size: 12px; 
              border-top: 1px solid #000;
              padding-top: 5px;
            }
            
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              font-size: 9px; 
              color: #666;
              border-top: 1px solid #000;
              padding-top: 10px;
            }
            
            .business-hours {
              font-size: 8px;
              color: #888;
              margin-top: 8px;
            }
            
            .print-button {
              background: #007bff;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              margin: 20px 0;
              font-size: 14px;
            }
            
            .print-button:hover {
              background: #0056b3;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="business-name">${businessConfig.name}</div>
            <div class="business-tagline">${businessConfig.tagline}</div>
            <div class="business-info">${businessConfig.address}</div>
            <div class="business-info">Phone: ${businessConfig.phone}</div>
            <div class="business-info">${businessConfig.website}</div>
            <div class="till-number">Buy Goods Till Number > 4242427</div>
          </div>
          
          <div class="receipt-details">
            <div><span class="label">Receipt #:</span> ${receiptNumber}</div>
            <div><span class="label">Date:</span> ${date}</div>
            <div><span class="label">Time:</span> ${time}</div>
            <div><span class="label">Customer:</span> ${sale.customer.name}</div>
            <div><span class="label">Phone:</span> ${sale.customer.phone}</div>
            <div><span class="label">Payment Method:</span> ${sale.paymentType}</div>
            <div><span class="label">Sold By:</span> ${sale.user?.name || 'N/A'}</div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(item => {
                const lineTotal = item.quantity * item.price;
                const isMeat = item.item?.category && isMeatProduct(item.item.category);
                const showWeight = isMeat && item.item?.unit === 'kg';
                
                return `
                  <tr>
                    <td>
                      <div class="item-name">${item.item?.name || 'Item'}</div>
                      ${item.item?.subtype ? `<div class="item-subtype">${item.item.subtype}</div>` : ''}
                    </td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: center;">${item.item?.unit || 'pcs'}</td>
                    <td style="text-align: right;">${formatCurrency(item.price)}</td>
                    <td style="text-align: right;">${formatCurrency(lineTotal)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            ${sale.discount > 0 ? `
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${formatCurrency(sale.totalAmount + sale.discount)}</span>
              </div>
              <div class="total-row">
                <span>Discount:</span>
                <span>-${formatCurrency(sale.discount)}</span>
              </div>
            ` : ''}
            <div class="total-row final">
              <span>Total Amount:</span>
              <span>${formatCurrency(sale.totalAmount)}</span>
            </div>
            <div class="total-row">
              <span>Amount Paid:</span>
              <span>${formatCurrency(sale.paidAmount)}</span>
            </div>
            ${sale.paidAmount < sale.totalAmount ? `
              <div class="total-row" style="color: #f59e0b; font-weight: bold;">
                <span>Outstanding Balance:</span>
                <span>${formatCurrency(sale.totalAmount - sale.paidAmount)}</span>
              </div>
            ` : ''}
            ${sale.paidAmount > sale.totalAmount ? `
              <div class="total-row" style="color: #10b981; font-weight: bold;">
                <span>Change:</span>
                <span>${formatCurrency(sale.paidAmount - sale.totalAmount)}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>${businessConfig.footer}</p>
            <p>This is a computer generated receipt</p>
            <div class="business-hours">${businessConfig.businessHours}</div>
          </div>
          
          <button class="print-button no-print" onclick="window.print()">Print Receipt</button>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => printReceipt(sale)}
    >
      <Printer className="h-4 w-4 mr-2" />
      Print Receipt
    </Button>
  );
}
