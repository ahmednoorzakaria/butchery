import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Calendar,
  Receipt,
  Eye,
  Edit,
  User,
  Calendar as CalendarIcon,
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { salesAPI } from "@/services/api";
import { Receipt as ReceiptComponent } from "./Receipt";
import { EditSaleDialog } from "./EditSaleDialog";
import { format, subDays } from "date-fns";

// Types
interface SaleItem {
  itemId: number;
  quantity: number;
  price: number;
  item: {
    id: number;
    name: string;
    unit: string;
    category: string;
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

interface ViewsProps {
  searchTerm: string;
  selectedUser: string;
  onSearchChange: (value: string) => void;
  onUserChange: (value: string) => void;
}

export function Views({
  searchTerm,
  selectedUser,
  onSearchChange,
  onUserChange,
}: ViewsProps) {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isSaleDetailOpen, setIsSaleDetailOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchInput, setSearchInput] = useState(searchTerm);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [accumulatedSales, setAccumulatedSales] = useState<Sale[]>([]);

  // Check if current user is admin
  const isAdmin = localStorage.getItem("user_role") === "ADMIN";

  // Fetch sales data with lazy loading
  const { 
    data: salesResponse, 
    isLoading: salesLoading, 
    error: salesError,
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ["sales", searchTerm, currentMonth],
    queryFn: async () => {
      try {
        // If searching for a specific sale ID, fetch without date restrictions
        if (searchTerm && !isNaN(parseInt(searchTerm))) {
          const response = await salesAPI.getAll({ 
            page: 1, 
            limit: 1000, // Higher limit for ID searches
            start: undefined,
            end: undefined
          });
          setHasMore(false); // No more data for ID searches
          return response;
        }
        
        // Regular month-based search with initial batch
        const response = await salesAPI.getAll({ 
          page: 1, 
          limit: 50, // Smaller initial batch for lazy loading
          start: subDays(currentMonth, 30).toISOString(),
          end: new Date().toISOString()
        });
        
        // Check if there are more pages
        const totalPages = response?.data?.pagination?.totalPages || 1;
        setHasMore(totalPages > 1);
        
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

  // Extract sales data safely and manage accumulated data
  const initialSales = Array.isArray(salesResponse?.data?.sales) ? salesResponse.data.sales : 
                      Array.isArray(salesResponse?.data) ? salesResponse.data : [];
  
  // Use accumulated sales for display, fallback to initial sales
  const sales = accumulatedSales.length > 0 ? accumulatedSales : initialSales;
  
  // Ensure query is executed when component mounts
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Update accumulated sales when initial data changes
  useEffect(() => {
    if (initialSales.length > 0 && accumulatedSales.length === 0) {
      setAccumulatedSales(initialSales);
    }
  }, [initialSales, accumulatedSales.length]);

  // Add scroll event listener for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) {
        // User is near bottom, load more data
        if (hasMore && !isLoadingMore && !salesLoading) {
          loadMoreSales();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, salesLoading]);

  // Refetch data when month changes
  useEffect(() => {
    setHasMore(true); // Reset hasMore when month changes
    setAccumulatedSales([]); // Reset accumulated sales
    refetch();
  }, [currentMonth, refetch]);

  // Handle search button click
  const handleSearch = () => {
    onSearchChange(searchInput);
    setHasMore(true); // Reset hasMore when searching
    setAccumulatedSales([]); // Reset accumulated sales
  };

  // Handle search input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  // Handle search input key press
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Load more sales data
  const loadMoreSales = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      // Calculate next page based on current data length
      const nextPage = Math.floor(sales.length / 50) + 1;
      
      const response = await salesAPI.getAll({ 
        page: nextPage, 
        limit: 50,
        start: subDays(currentMonth, 30).toISOString(),
        end: new Date().toISOString()
      });
      
      if (response?.data?.sales) {
        // Append new sales to existing data
        const newSales = response.data.sales;
        setAccumulatedSales(prev => [...prev, ...newSales]);
        
        // Check if there are more pages
        const totalPages = response.data.pagination?.totalPages || 1;
        setHasMore(nextPage < totalPages);
      }
    } catch (error) {
      console.error('Error loading more sales:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Component state management

  // Filter sales based on search, date, and user
  const filteredSales = sales.filter((sale: Sale) => {
    const matchesSearch = (() => {
      if (searchTerm === "") return true;
      
      // Check if search term is a number (exact sale ID match)
      const searchAsNumber = parseInt(searchTerm);
      if (!isNaN(searchAsNumber)) {
        return sale.id === searchAsNumber;
      }
      
      // For non-numeric searches, use includes for customer name and username
      return (
        sale.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.user?.name && sale.user.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    })();

    // If searching by ID, don't apply date restrictions
    const matchesDate = (() => {
      if (searchTerm && !isNaN(parseInt(searchTerm))) {
        return true; // Skip date filtering for ID searches
      }
      
      const saleDate = new Date(sale.createdAt);
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
      return saleDate >= startDate && saleDate <= endDate;
    })();

    const matchesUser = selectedUser === "all" || sale.userId.toString() === selectedUser;

    return matchesSearch && matchesDate && matchesUser;
  });

  // Get unique users for filtering
  const uniqueUsers: User[] = sales ? Array.from(
    new Map(sales.map((sale: Sale) => [sale.userId, sale.user])).values()
  ).filter((user): user is User => user !== null && user !== undefined) : [];

  // Calculate current month's total
  const currentMonthTotal = sales ? sales
    .filter((sale: Sale) => {
      // If searching by ID, don't apply date restrictions to summary
      if (searchTerm && !isNaN(parseInt(searchTerm))) {
        return true;
      }
      
      const saleDate = new Date(sale.createdAt);
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
      return saleDate >= startDate && saleDate <= endDate;
    })
    .reduce((sum: number, sale: Sale) => sum + sale.totalAmount, 0) : 0;

  // Calculate current month's transaction count
  const currentMonthTransactions = sales ? sales
    .filter((sale: Sale) => {
      // If searching by ID, don't apply date restrictions to summary
      if (searchTerm && !isNaN(parseInt(searchTerm))) {
        return true;
      }
      
      const saleDate = new Date(sale.createdAt);
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
      return saleDate >= startDate && saleDate <= endDate;
    }).length : 0;

  // Handle month navigation
  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
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
                <p className="text-sm text-muted-foreground">Sales This Month</p>
                <p className="text-2xl font-bold">
                  KSH {currentMonthTotal.toLocaleString()}
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
                <p className="text-2xl font-bold">{currentMonthTransactions}</p>
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
                  {currentMonthTransactions > 0
                    ? Math.round(currentMonthTotal / currentMonthTransactions).toLocaleString()
                    : "0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Month Navigation</p>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMonthChange('prev')}
                  >
                    ←
                  </Button>
                  <span className="text-sm font-medium">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMonthChange('next')}
                  >
                    →
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Notice */}
      {!isAdmin && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-blue-800">
              <div className="h-5 w-5 text-blue-600">ℹ️</div>
              <p className="text-sm">
                <span className="font-medium">Note:</span> Only administrators can edit sales. 
                Sales users can view sales details and generate receipts.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer, sale ID, or username..."
              value={searchInput}
              onChange={handleSearchInputChange}
              onKeyPress={handleSearchKeyPress}
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
            <Button onClick={handleSearch} disabled={searchInput === searchTerm}>
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="space-y-4">
        {/* Month Summary Header */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {searchTerm && !isNaN(parseInt(searchTerm)) 
                    ? `Search Results for Sale #${searchTerm}`
                    : `Sales for ${format(currentMonth, 'MMMM yyyy')}`
                  }
                </h3>
                <p className="text-sm text-muted-foreground">
                  {currentMonthTransactions} transactions • KSH {currentMonthTotal.toLocaleString()} total
                  {searchTerm && !isNaN(parseInt(searchTerm)) && " (All time)"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Average per sale</p>
                <p className="text-lg font-semibold">
                  KSH {currentMonthTransactions > 0 ? Math.round(currentMonthTotal / currentMonthTransactions).toLocaleString() : '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingSale(sale);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                    <ReceiptComponent sale={sale} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={loadMoreSales}
              disabled={isLoadingMore}
              className="flex items-center gap-2"
            >
              {isLoadingMore ? (
                <>
                  <LoadingSpinner size="sm" />
                  Loading...
                </>
              ) : (
                'Load More Sales'
              )}
            </Button>
          </div>
        )}

        {/* Loading indicator for infinite scroll */}
        {isLoadingMore && (
          <div className="flex justify-center mt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <LoadingSpinner size="sm" />
              <span>Loading more sales...</span>
            </div>
          </div>
        )}
      </div>

      {/* Sale Detail Dialog */}
      <Dialog open={isSaleDetailOpen} onOpenChange={setIsSaleDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sale Details - #{selectedSale?.id}</DialogTitle>
            <DialogDescription>
              View detailed information about this sale transaction.
            </DialogDescription>
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

              {/* Notes Section */}
              {selectedSale.notes && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-medium mb-2 text-blue-900">Notes</h3>
                  <p className="text-blue-800 whitespace-pre-wrap">{selectedSale.notes}</p>
                </div>
              )}

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
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingSale(selectedSale);
                      setIsEditDialogOpen(true);
                      setIsSaleDetailOpen(false);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
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
            <Button 
              variant="outline" 
              onClick={() => {
                onSearchChange("");
                setSearchInput("");
                setHasMore(true);
                setAccumulatedSales([]);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </Card>
      )}

      {/* Edit Sale Dialog */}
      <EditSaleDialog
        sale={editingSale}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingSale(null);
        }}
      />


    </div>
  );
}
