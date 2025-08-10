import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Calendar,
  Receipt,
  Eye,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { salesAPI } from "@/services/api";
import { Receipt as ReceiptComponent } from "./Receipt";

// Types
interface SaleItem {
  itemId: number;
  quantity: number;
  price: number;
  item?: {
    name: string;
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
  createdAt: string;
  customer: Customer;
  user: User;
  userId: number;
  items: SaleItem[];
}

interface ViewsProps {
  searchTerm: string;
  selectedDate: string;
  selectedUser: string;
  onSearchChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onUserChange: (value: string) => void;
}

export function Views({
  searchTerm,
  selectedDate,
  selectedUser,
  onSearchChange,
  onDateChange,
  onUserChange,
}: ViewsProps) {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isSaleDetailOpen, setIsSaleDetailOpen] = useState(false);

  // Fetch sales data with improved configuration
  const { 
    data: salesResponse, 
    isLoading: salesLoading, 
    error: salesError,
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      console.log('Fetching sales...');
      try {
        const response = await salesAPI.getAll();
        console.log('Sales response:', response);
        return response;
      } catch (error) {
        console.error('Error fetching sales:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Ensure query is executed when component mounts
  useEffect(() => {
    console.log('Views component mounted, triggering sales query...');
    refetch();
  }, [refetch]);

  // Debug logging
  console.log('Views render state:', { 
    salesResponse, 
    salesLoading, 
    salesError, 
    isFetching,
    salesLength: salesResponse?.data?.length 
  });

  // Extract sales data safely
  const sales = Array.isArray(salesResponse?.data) ? salesResponse.data : [];
  
  // Filter sales based on search, date, and user
  const filteredSales = sales.filter((sale: Sale) => {
    const matchesSearch =
      searchTerm === "" ||
      sale.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.id.toString().includes(searchTerm) ||
      (sale.user?.name && sale.user.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDate = (() => {
      const saleDate = new Date(sale.createdAt);
      const now = new Date();
      
      switch (selectedDate) {
        case "today":
          return saleDate.toDateString() === now.toDateString();
        case "week": {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return saleDate >= weekAgo;
        }
        case "month":
          return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        case "year":
          return saleDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    })();

    const matchesUser = selectedUser === "all" || sale.userId.toString() === selectedUser;

    return matchesSearch && matchesDate && matchesUser;
  });

  // Get unique users for filtering
  const uniqueUsers = sales ? Array.from(
    new Map(sales.map((sale: Sale) => [sale.userId, sale.user])).values()
  ).filter(Boolean) : [];

  // Calculate today's total
  const todayTotal = sales ? sales
    .filter((sale: Sale) => {
      const saleDate = new Date(sale.createdAt);
      const today = new Date();
      return saleDate.toDateString() === today.toDateString();
    })
    .reduce((sum: number, sale: Sale) => sum + sale.totalAmount, 0) : 0;



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

  if (salesLoading || isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show error state
  if (salesError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-center">
          <div className="h-12 w-12 text-destructive mx-auto mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Failed to load sales</h3>
          <p className="text-muted-foreground mb-4">
            {salesError instanceof Error ? salesError.message : "An error occurred while loading sales"}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
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
                  {sales && sales.length > 0
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
                  {sales ? sales.reduce(
                    (sum: number, sale: Sale) =>
                      sum +
                      sale.items.reduce(
                        (itemSum, item) => itemSum + item.quantity,
                        0
                      ),
                    0
                  ) : 0}
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
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Select value={selectedUser} onValueChange={onUserChange}>
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
              onClick={() => onDateChange("today")}
            >
              Today
            </Button>
            <Button
              variant={selectedDate === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => onDateChange("week")}
            >
              This Week
            </Button>
            <Button
              variant={selectedDate === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => onDateChange("month")}
            >
              This Month
            </Button>
            <Button
              variant={selectedDate === "year" ? "default" : "outline"}
              size="sm"
              onClick={() => onDateChange("year")}
            >
              This Year
            </Button>
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="space-y-4">
        {filteredSales.map((sale: Sale) => (
          <Card
            key={sale.id}
            className="hover:shadow-lg transition-all duration-300"
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
                    <ReceiptComponent sale={sale} />
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
                            selectedSale.totalAmount + selectedSale.discount
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
                          {(selectedSale.totalAmount - selectedSale.paidAmount).toLocaleString()}
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
                <ReceiptComponent sale={selectedSale} />
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
  );
}
