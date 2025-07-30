import { useState, useRef } from "react";
import { Plus, Search, Calendar, Receipt, Eye, Printer, ShoppingCart, Trash2, X } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Mock inventory for sale creation
const mockInventory = [
  { id: 1, name: "Goat Meat - Fresh Cut", price: 1200, unit: "kg", stock: 25 },
  { id: 2, name: "Chicken Breast - Boneless", price: 800, unit: "kg", stock: 8 },
  { id: 3, name: "Camel Meat - Premium", price: 1500, unit: "kg", stock: 15 },
  { id: 4, name: "Farm Fresh Eggs", price: 450, unit: "dozen", stock: 5 },
  { id: 5, name: "Berbere Spice Mix", price: 150, unit: "g", stock: 50 }
];

// Mock sales data
const mockSales = [
  {
    id: "SAL001",
    customer: "Ahmed Hassan",
    date: "2024-01-20",
    time: "14:30",
    items: [
      { id: 1, name: "Goat Meat - Fresh Cut", quantity: 2, price: 1200, total: 2400 },
      { id: 5, name: "Berbere Spice Mix", quantity: 100, price: 150, total: 15000 }
    ],
    total: 17400,
    paymentMethod: "Cash",
    status: "Completed"
  },
  {
    id: "SAL002", 
    customer: "Sarah Mohammed",
    date: "2024-01-20",
    time: "13:15",
    items: [
      { id: 2, name: "Chicken Breast - Boneless", quantity: 1, price: 800, total: 800 },
      { id: 4, name: "Farm Fresh Eggs", quantity: 2, price: 450, total: 900 }
    ],
    total: 1700,
    paymentMethod: "Transfer",
    status: "Completed"
  }
];

interface SaleItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Sale {
  id: string;
  customer: string;
  date: string;
  time: string;
  items: SaleItem[];
  total: number;
  paymentMethod: string;
  status: string;
}

export default function SalesManagement() {
  const [sales, setSales] = useState<Sale[]>(mockSales);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("today");
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isSaleDetailOpen, setIsSaleDetailOpen] = useState(false);

  // New sale state
  const [customer, setCustomer] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);

  const printRef = useRef<HTMLDivElement>(null);

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const todayTotal = sales
    .filter(sale => sale.date === "2024-01-20")
    .reduce((sum, sale) => sum + sale.total, 0);

  const addItemToSale = () => {
    if (!selectedProduct || quantity <= 0) return;
    
    const product = mockInventory.find(p => p.id.toString() === selectedProduct);
    if (!product) return;

    const existingItemIndex = saleItems.findIndex(item => item.id === product.id);
    
    if (existingItemIndex >= 0) {
      const updatedItems = [...saleItems];
      updatedItems[existingItemIndex].quantity += quantity;
      updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].quantity * product.price;
      setSaleItems(updatedItems);
    } else {
      const newItem: SaleItem = {
        id: product.id,
        name: product.name,
        quantity,
        price: product.price,
        total: quantity * product.price
      };
      setSaleItems([...saleItems, newItem]);
    }
    
    setSelectedProduct("");
    setQuantity(1);
  };

  const removeItemFromSale = (itemId: number) => {
    setSaleItems(saleItems.filter(item => item.id !== itemId));
  };

  const calculateSaleTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total, 0);
  };

  const completeSale = () => {
    if (!customer || !paymentMethod || saleItems.length === 0) return;

    const newSale: Sale = {
      id: `SAL${String(sales.length + 1).padStart(3, '0')}`,
      customer,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      items: saleItems,
      total: calculateSaleTotal(),
      paymentMethod,
      status: "Completed"
    };

    setSales([newSale, ...sales]);
    
    // Reset form
    setCustomer("");
    setPaymentMethod("");
    setSaleItems([]);
    setIsNewSaleOpen(false);
  };

  const printReceipt = (sale: Sale) => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${sale.id}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .receipt { max-width: 400px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 20px; }
              .item { display: flex; justify-content: space-between; margin: 5px 0; }
              .total { border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <h2>MEAT SHOP RECEIPT</h2>
                <p>Sale ID: ${sale.id}</p>
                <p>Date: ${sale.date} ${sale.time}</p>
                <p>Customer: ${sale.customer}</p>
              </div>
              <div class="items">
                ${sale.items.map(item => `
                  <div class="item">
                    <span>${item.name} (${item.quantity}x)</span>
                    <span>₦${item.total.toLocaleString()}</span>
                  </div>
                `).join('')}
              </div>
              <div class="total">
                <div class="item">
                  <span>TOTAL</span>
                  <span>₦${sale.total.toLocaleString()}</span>
                </div>
                <div class="item">
                  <span>Payment Method</span>
                  <span>${sale.paymentMethod}</span>
                </div>
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <p>Thank you for your business!</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case "Cash": return "bg-success/10 text-success";
      case "Transfer": return "bg-primary/10 text-primary";
      case "Card": return "bg-warning/10 text-warning";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Layout title="Sales Management" showSearch={false}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Today's Sales</p>
                  <p className="text-2xl font-bold">₦{todayTotal.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold">{filteredSales.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Sale</p>
                  <p className="text-2xl font-bold">₦{Math.round(todayTotal / sales.filter(s => s.date === "2024-01-20").length).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Items Sold</p>
                  <p className="text-2xl font-bold">{sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer or sale ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={selectedDate === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDate("today")}
              >
                Today
              </Button>
              <Button
                variant={selectedDate === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDate("week")}
              >
                This Week
              </Button>
              <Button
                variant={selectedDate === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDate("month")}
              >
                This Month
              </Button>
            </div>
          </div>
          
          <Dialog open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="lg" className="w-full md:w-auto">
                <Plus className="h-5 w-5 mr-2" />
                New Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Sale</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Customer and Payment Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Customer Name</label>
                    <Input
                      placeholder="Enter customer name"
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Payment Method</label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Transfer">Transfer</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Add Items */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-4">Add Items</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockInventory.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} - ₦{product.price}/{product.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        min="1"
                      />
                    </div>
                    <Button onClick={addItemToSale} disabled={!selectedProduct}>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>

                {/* Sale Items */}
                {saleItems.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-4">Sale Items</h3>
                    <div className="space-y-2">
                      {saleItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground ml-2">
                              {item.quantity}x ₦{item.price}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">₦{item.total.toLocaleString()}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItemFromSale(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t mt-4 pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>₦{calculateSaleTotal().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsNewSaleOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={completeSale}
                    disabled={!customer || !paymentMethod || saleItems.length === 0}
                  >
                    Complete Sale
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sales List */}
        <div className="space-y-4">
          {filteredSales.map((sale) => (
            <Card key={sale.id} className="hover:shadow-primary transition-smooth">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                  <div className="flex items-start space-x-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-lg">{sale.id}</h3>
                        <Badge className={cn("text-xs", getPaymentMethodColor(sale.paymentMethod))}>
                          {sale.paymentMethod}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{sale.customer}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {sale.date} at {sale.time}
                        </span>
                        <span>{sale.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">₦{sale.total.toLocaleString()}</p>
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        {sale.status}
                      </Badge>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedSale(sale);
                          setIsSaleDetailOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => printReceipt(sale)}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sale Detail Dialog */}
        <Dialog open={isSaleDetailOpen} onOpenChange={setIsSaleDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sale Details - {selectedSale?.id}</DialogTitle>
            </DialogHeader>
            
            {selectedSale && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Customer</label>
                    <p className="text-lg">{selectedSale.customer}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                    <p className="text-lg">{selectedSale.date} at {selectedSale.time}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                    <Badge className={cn("text-xs", getPaymentMethodColor(selectedSale.paymentMethod))}>
                      {selectedSale.paymentMethod}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge variant="secondary" className="bg-success/10 text-success">
                      {selectedSale.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Items</h3>
                  <div className="space-y-2">
                    {selectedSale.items.map((item, index) => (
                      <div key={index} className="flex justify-between p-2 bg-muted rounded">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground ml-2">
                            {item.quantity}x ₦{item.price}
                          </span>
                        </div>
                        <span className="font-medium">₦{item.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-4 pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>₦{selectedSale.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsSaleDetailOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => printReceipt(selectedSale)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Receipt
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {filteredSales.length === 0 && (
          <Card className="p-8">
            <div className="text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sales found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or date filter
              </p>
              <Button variant="outline">Clear Filters</Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}