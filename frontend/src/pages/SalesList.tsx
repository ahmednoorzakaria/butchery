import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Calendar,
  Receipt,
  Eye,
  Printer,
  ShoppingCart,
  Trash2,
  User,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { salesAPI, inventoryAPI, customersAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

// Types
interface InventoryItem {
  id: number;
  name: string;
  price: number;
  unit: string;
  quantity: number;
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

interface SaleItem {
  itemId: number;
  quantity: number;
  price: number;
  item?: {
    name: string;
  };
}

interface Sale {
  id: number;
  customerId: number;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  paymentType: string;
  createdAt: string;
  customer: Customer;
  user: User;
  userId: number;
  items: SaleItem[];
}

interface NewSaleItem {
  itemId: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export default function SalesManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("today");
  const [selectedUser, setSelectedUser] = useState("all");
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isSaleDetailOpen, setIsSaleDetailOpen] = useState(false);

  // New sale state
  const [customerId, setCustomerId] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [saleItems, setSaleItems] = useState<NewSaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch data
  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => salesAPI.getAll().then((res) => res.data),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryAPI.getAll().then((res) => res.data),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersAPI.getAll().then((res) => res.data),
  });

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: (saleData: any) => salesAPI.create(saleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setIsNewSaleOpen(false);
      resetSaleForm();
      toast({
        title: "Success",
        description: "Sale completed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to complete sale",
        variant: "destructive",
      });
    },
  });

  const resetSaleForm = () => {
    setCustomerId("");
    setPaymentType("");
    setSaleItems([]);
    setSelectedProduct("");
    setQuantity(1);
    setDiscount(0);
    setPaidAmount(0);
  };

  // Get unique users from sales data for filtering
  const uniqueUsers = sales.reduce((acc: User[], sale: Sale) => {
    if (sale.user && !acc.some(user => user.id === sale.user.id)) {
      acc.push(sale.user);
    }
    return acc;
  }, []);

  const filteredSales = sales.filter((sale: Sale) => {
    const matchesSearch =
      sale.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.id.toString().includes(searchTerm.toLowerCase()) ||
      (sale.user?.name && sale.user.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesUser = selectedUser === "all" || sale.user?.id.toString() === selectedUser;
    
    return matchesSearch && matchesUser;
  });

  const todayTotal = sales
    .filter(
      (sale: Sale) =>
        new Date(sale.createdAt).toDateString() === new Date().toDateString()
    )
    .reduce((sum: number, sale: Sale) => sum + sale.totalAmount, 0);

  const addItemToSale = () => {
    if (!selectedProduct || quantity <= 0) return;

    const product = inventory.find(
      (p: InventoryItem) => p.id.toString() === selectedProduct
    );
    if (!product) return;

    const existingItemIndex = saleItems.findIndex(
      (item) => item.itemId === product.id
    );

    if (existingItemIndex >= 0) {
      const updatedItems = [...saleItems];
      updatedItems[existingItemIndex].quantity += quantity;
      updatedItems[existingItemIndex].total =
        updatedItems[existingItemIndex].quantity * product.price;
      setSaleItems(updatedItems);
    } else {
      const newItem: NewSaleItem = {
        itemId: product.id,
        name: product.name,
        quantity,
        price: product.price,
        total: quantity * product.price,
      };
      setSaleItems([...saleItems, newItem]);
    }

    setSelectedProduct("");
    setQuantity(1);
  };

  const removeItemFromSale = (itemId: number) => {
    setSaleItems(saleItems.filter((item) => item.itemId !== itemId));
  };

  const calculateSaleTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateNetTotal = () => {
    return calculateSaleTotal() - discount;
  };

  const completeSale = () => {
    if (!customerId || !paymentType || saleItems.length === 0) return;

    const netTotal = calculateNetTotal();
    const finalPaidAmount = paidAmount ?? netTotal;

    const userId = parseInt(localStorage.getItem("user_id") || "0");

    const saleData = {
      customerId: parseInt(customerId),
      userId,
      items: saleItems.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        price: item.price,
      })),
      discount,
      paidAmount: finalPaidAmount,
      paymentType,
    };

    createSaleMutation.mutate(saleData);
  };

  const printReceipt = (sale: Sale) => {
    const printWindow = window.open("", "", "height=600,width=800");
    if (printWindow) {
      const effectivePaid = sale.paidAmount + sale.discount;
      const outstanding =
        effectivePaid < sale.totalAmount
          ? sale.totalAmount - effectivePaid
          : 0;

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
              .outstanding { color: #f59e0b; }
              .thank-you { text-align: center; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <h2>HYPER FRESH BUTCHERY</h2>
                <p>Sale ID: ${sale.id}</p>
                <p>Date: ${new Date(sale.createdAt).toLocaleDateString()}</p>
                <p>Customer: ${sale.customer.name}</p>
                <p>Phone: ${sale.customer.phone}</p>
                <p>Sold by: ${sale.user?.name || 'N/A'}</p>
              </div>

              <div class="items">
                ${sale.items
                  .map(
                    (item) => `
                  <div class="item">
                    <span>${item.item?.name || "Item"} (${item.quantity}x)</span>
                    <span>KSH ${(
                      item.quantity * item.price
                    ).toLocaleString()}</span>
                  </div>`
                  )
                  .join("")}
              </div>

              <div class="total">
                <div class="item">
                  <span>Subtotal</span>
                  <span>KSH ${(sale.totalAmount - sale.discount).toLocaleString()}</span>
                </div>

                ${
                  sale.discount > 0
                    ? `
                  <div class="item">
                    <span>Discount</span>
                    <span>-KSH ${sale.discount.toLocaleString()}</span>
                  </div>`
                    : ""
                }

                <div class="item">
                  <span>Total</span>
                  <span>KSH ${sale.totalAmount.toLocaleString()}</span>
                </div>

                <div class="item">
                  <span>Amount Paid</span>
                  <span>KSH ${sale.paidAmount.toLocaleString()}</span>
                </div>

                ${
                  outstanding > 0
                    ? `
                  <div class="item outstanding">
                    <span>Outstanding</span>
                    <span>KSH ${outstanding.toLocaleString()}</span>
                  </div>`
                    : ""
                }

                <div class="item">
                  <span>Payment Method</span>
                  <span>${sale.paymentType}</span>
                </div>
              </div>

              <div class="thank-you">
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
      case "CASH":
        return "bg-success/10 text-success";
      case "TRANSFER":
        return "bg-primary/10 text-primary";
      case "CARD":
        return "bg-warning/10 text-warning";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (salesLoading) {
    return (
      <Layout title="Sales Management" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

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
                  <p className="text-2xl font-bold">
                    KSH {todayTotal.toLocaleString()}
                  </p>
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
                  <p className="text-2xl font-bold">
                    KSH{" "}
                    {sales.length > 0
                      ? Math.round(
                          sales.reduce(
                            (sum: number, sale: Sale) => sum + sale.totalAmount,
                            0
                          ) / sales.length
                        ).toLocaleString()
                      : "0"}
                  </p>
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
                  <p className="text-2xl font-bold">
                    {sales.reduce(
                      (sum: number, sale: Sale) =>
                        sum +
                        sale.items.reduce(
                          (itemSum, item) => itemSum + item.quantity,
                          0
                        ),
                      0
                    )}
                  </p>
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
                placeholder="Search by customer, sale ID, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <label className="text-sm font-medium mb-2 block">
                      Customer
                    </label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer: Customer) => (
                          <SelectItem
                            key={customer.id}
                            value={customer.id.toString()}
                          >
                            {customer.name} - {customer.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Payment Method
                    </label>
                    <Select value={paymentType} onValueChange={setPaymentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="TRANSFER">Transfer</SelectItem>
                        <SelectItem value="CARD">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Add Items */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-4">Add Items</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <Select
                        value={selectedProduct}
                        onValueChange={setSelectedProduct}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventory.map((product: InventoryItem) => (
                            <SelectItem
                              key={product.id}
                              value={product.id.toString()}
                            >
                              {product.name} - KSH {product.price}/{product.unit}{" "}
                              (Stock: {product.quantity})
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
                        <div
                          key={item.itemId}
                          className="flex items-center justify-between p-2 bg-muted rounded"
                        >
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground ml-2">
                              {item.quantity}x KSH {item.price}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              KSH {item.total.toLocaleString()}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItemFromSale(item.itemId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t mt-4 pt-4 space-y-2">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium">
                          Discount (KSH):
                        </label>
                        <Input
                          type="number"
                          value={discount}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          className="w-32"
                          min="0"
                        />
                      </div>
                      <div className="flex justify-between text-lg">
                        <span>Subtotal:</span>
                        <span>KSH {calculateSaleTotal().toLocaleString()}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Discount:</span>
                          <span>-KSH {discount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total:</span>
                        <span>KSH {calculateNetTotal().toLocaleString()}</span>
                      </div>

                      {/* Payment Amount Section */}
                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <label className="text-sm font-medium">
                            Amount Paid (KSH):
                          </label>
                          <Input
                            type="number"
                            value={
                              paidAmount !== null && paidAmount !== undefined
                                ? paidAmount
                                : calculateNetTotal()
                            }
                            onChange={(e) =>
                              setPaidAmount(Number(e.target.value))
                            }
                            className="w-32"
                            min="0"
                            max={calculateNetTotal()}
                          />
                        </div>

                        {paidAmount && paidAmount < calculateNetTotal() && (
                          <div className="bg-warning/10 border border-warning/20 rounded p-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-warning-foreground">
                                Amount Due:
                              </span>
                              <span className="font-medium text-warning-foreground">
                                KSH{" "}
                                {(
                                  calculateNetTotal() - paidAmount
                                ).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-warning-foreground mt-1">
                              This sale will be recorded as credit/debt for the
                              customer
                            </p>
                          </div>
                        )}

                        {paidAmount && paidAmount > calculateNetTotal() && (
                          <div className="bg-success/10 border border-success/20 rounded p-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-success-foreground">
                                Change:
                              </span>
                              <span className="font-medium text-success-foreground">
                                KSH{" "}
                                {(
                                  paidAmount - calculateNetTotal()
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsNewSaleOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={completeSale}
                    disabled={
                      !customerId ||
                      !paymentType ||
                      saleItems.length === 0 ||
                      createSaleMutation.isPending
                    }
                  >
                    {createSaleMutation.isPending
                      ? "Processing..."
                      : "Complete Sale"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sales List */}
        <div className="space-y-4">
          {filteredSales.map((sale: Sale) => (
            <Card
              key={sale.id}
              className="hover:shadow-primary transition-smooth"
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                  <div className="flex items-start space-x-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-lg">#{sale.id}</h3>
                        <Badge
                          className={cn(
                            "text-xs",
                            getPaymentMethodColor(sale.paymentType)
                          )}
                        >
                          {sale.paymentType}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {sale.customer.name}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(
                            sale.createdAt
                          ).toLocaleDateString()} at{" "}
                          {new Date(sale.createdAt).toLocaleTimeString()}
                        </span>
                        <span>
                          {sale.items.reduce(
                            (sum, item) => sum + item.quantity,
                            0
                          )}{" "}
                          items
                        </span>
                        <span className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          Sale made by: {sale.user?.name || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        KSH {sale.totalAmount.toLocaleString()}
                      </p>
                      <div className="flex gap-1 justify-end">
                        <Badge
                          variant="secondary"
                          className="bg-success/10 text-success"
                        >
                          Completed
                        </Badge>
                        {sale.paidAmount < sale.totalAmount && (
                          <Badge className="bg-destructive/10 text-destructive-foreground">
                            Credit
                          </Badge>
                        )}
                      </div>
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
              <DialogTitle>Sale Details - #{selectedSale?.id}</DialogTitle>
            </DialogHeader>

            {selectedSale && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Customer
                    </label>
                    <p className="text-lg">{selectedSale.customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSale.customer.phone}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Date & Time
                    </label>
                    <p className="text-lg">
                      {new Date(selectedSale.createdAt).toLocaleDateString()} at{" "}
                      {new Date(selectedSale.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Payment Method
                    </label>
                    <Badge
                      className={cn(
                        "text-xs",
                        getPaymentMethodColor(selectedSale.paymentType)
                      )}
                    >
                      {selectedSale.paymentType}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Sale Made By
                    </label>
                    <p className="text-lg">{selectedSale.user?.name || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Items</h3>
                  <div className="space-y-2">
                    {selectedSale.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between p-2 bg-muted rounded"
                      >
                        <div>
                          <span className="font-medium">
                            {item.item?.name || "Item"}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            {item.quantity}x KSH {item.price}
                          </span>
                        </div>
                        <span className="font-medium">
                          KSH {(item.quantity * item.price).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-4 pt-4">
                    {selectedSale.discount > 0 && (
                      <>
                        <div className="flex justify-between text-lg">
                          <span>Subtotal:</span>
                          <span>
                            KSH{" "}
                            {(
                              selectedSale.totalAmount - selectedSale.discount
                            ).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Discount:</span>
                          <span>
                            -KSH {selectedSale.discount.toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>KSH {selectedSale.totalAmount.toLocaleString()}</span>
                    </div>
                    {selectedSale.paidAmount < selectedSale.totalAmount && (
                      <>
                        <div className="flex justify-between text-md">
                          <span>Amount Paid:</span>
                          <span>
                            KSH {selectedSale.paidAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-warning">
                          <span>Outstanding:</span>
                          <span>
                            KSH{" "}
                            {(
                              selectedSale.totalAmount -
                              (selectedSale.paidAmount + selectedSale.discount)
                            ).toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsSaleDetailOpen(false)}
                  >
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